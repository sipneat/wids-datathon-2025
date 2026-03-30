import json
from datetime import datetime, timezone
from pathlib import Path

from flask import Blueprint, jsonify, request

from firebase_init import db

housing_bp = Blueprint('housing', __name__, url_prefix='')
USER_ID_HEADER = 'X-User-Id'

_DATA_PATH = Path(__file__).resolve().parents[1] / 'zillow_data.json'
_ZILLOW_CACHE = None


def _load_zillow_data():
    global _ZILLOW_CACHE
    if _ZILLOW_CACHE is None:
        with _DATA_PATH.open('r', encoding='utf-8') as file:
            _ZILLOW_CACHE = json.load(file)
    return _ZILLOW_CACHE


def get_user_id():
    user_id = request.headers.get(USER_ID_HEADER)
    if not user_id:
        return None, (jsonify({'error': f'Missing {USER_ID_HEADER} header'}), 400)
    return user_id, None


def _normalize_listing(item):
    prop = item.get('property', {})
    address = prop.get('address', {})
    location = prop.get('location', {})
    media = prop.get('media', {})
    photo_links = media.get('propertyPhotoLinks', {})
    all_photos = media.get('allPropertyPhotos', {})
    medium_photos = all_photos.get('medium', []) if isinstance(all_photos, dict) else []

    price = None
    price_info = prop.get('price')
    if isinstance(price_info, dict):
        price = price_info.get('price')
    if price is None:
        price = prop.get('minPrice')

    zpid = prop.get('zpid')
    details_url = f"https://www.zillow.com/homedetails/{zpid}_zpid/" if zpid else None

    return {
        'id': zpid,
        'title': prop.get('title') or address.get('streetAddress') or 'Listing',
        'address': {
            'street': address.get('streetAddress'),
            'city': address.get('city'),
            'state': address.get('state'),
            'zipcode': address.get('zipcode')
        },
        'location': {
            'latitude': location.get('latitude'),
            'longitude': location.get('longitude')
        },
        'price': price,
        'minPrice': prop.get('minPrice'),
        'maxPrice': prop.get('maxPrice'),
        'bedrooms': prop.get('bedrooms'),
        'bathrooms': prop.get('bathrooms'),
        'sqft': prop.get('livingArea'),
        'propertyType': prop.get('propertyType') or prop.get('groupType') or 'rental',
        'listingStatus': prop.get('listingStatus'),
        'photo': photo_links.get('mediumSizeLink') or (medium_photos[0] if medium_photos else None),
        'detailsUrl': details_url,
    }


@housing_bp.route('/housing/zillow', methods=['GET', 'OPTIONS'])
def get_zillow_listings():
    if request.method == 'OPTIONS':
        return '', 204

    data = _load_zillow_data()
    zip_filter = request.args.get('zipcode')
    state_filter = request.args.get('state')
    city_filter = request.args.get('city')

    results = []
    for item in data.get('searchResults', []):
        listing = _normalize_listing(item)
        address = listing.get('address', {})
        if zip_filter and address.get('zipcode') != zip_filter:
            continue
        if state_filter and address.get('state') != state_filter:
            continue
        if city_filter and address.get('city') != city_filter:
            continue
        results.append(listing)

    return jsonify({'listings': results}), 200


@housing_bp.route('/housing/context', methods=['POST', 'GET', 'OPTIONS'])
def housing_context_route():
    if request.method == 'OPTIONS':
        return '', 204

    user_id, auth_error = get_user_id()
    if auth_error:
        return auth_error

    if request.method == 'GET':
        try:
            docs = list(
                db.collection('housingContexts')
                .where('userId', '==', user_id)
                .stream()
            )
            docs.sort(
                key=lambda d: ((d.to_dict() or {}).get('updatedAt') or datetime.min.replace(tzinfo=timezone.utc)),
                reverse=True,
            )
            if not docs:
                return jsonify({'context': None}), 200

            payload = docs[0].to_dict() or {}
            payload['id'] = docs[0].id
            return jsonify({'context': payload}), 200
        except Exception as e:
            print(f'Error loading housing context: {e}')
            return jsonify({'error': str(e)}), 500

    try:
        body = request.get_json(silent=True) or {}
        search_zip = str(body.get('searchZip') or '').strip()
        housing_type = str(body.get('housingType') or 'all').strip()
        filters = body.get('filters') if isinstance(body.get('filters'), dict) else {}
        listings = body.get('listings') if isinstance(body.get('listings'), list) else []

        compact_listings = []
        for item in listings[:20]:
            if not isinstance(item, dict):
                continue
            compact_listings.append(
                {
                    'id': item.get('id'),
                    'name': item.get('name'),
                    'address': item.get('address'),
                    'rent': item.get('rent'),
                    'bedrooms': item.get('bedrooms'),
                    'bathrooms': item.get('bathrooms'),
                    'riskLevel': item.get('riskLevel'),
                    'fireDistance': item.get('fireDistance'),
                    'jobDistance': item.get('jobDistance'),
                    'schoolDistance': item.get('schoolDistance'),
                    'tradeoff': item.get('tradeoff'),
                    'url': item.get('url'),
                }
            )

        payload = {
            'userId': user_id,
            'searchZip': search_zip,
            'housingType': housing_type,
            'filters': filters,
            'listings': compact_listings,
            'updatedAt': datetime.now(timezone.utc),
        }

        doc_ref = db.collection('housingContexts').document(user_id)
        doc_ref.set(payload, merge=True)
        payload['id'] = doc_ref.id
        return jsonify({'context': payload}), 200
    except Exception as e:
        print(f'Error saving housing context: {e}')
        return jsonify({'error': str(e)}), 500
