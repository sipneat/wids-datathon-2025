import json
from pathlib import Path

from flask import Blueprint, jsonify, request

housing_bp = Blueprint('housing', __name__, url_prefix='')

_DATA_PATH = Path(__file__).resolve().parents[1] / 'zillow_data.json'
_ZILLOW_CACHE = None


def _load_zillow_data():
    global _ZILLOW_CACHE
    if _ZILLOW_CACHE is None:
        with _DATA_PATH.open('r', encoding='utf-8') as file:
            _ZILLOW_CACHE = json.load(file)
    return _ZILLOW_CACHE


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
