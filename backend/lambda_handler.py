import serverless_wsgi

from server import app


def handler(event, context):
    return serverless_wsgi.handle_request(app, event, context)
