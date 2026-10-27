#!/usr/bin/env python3
"""Parcours HTTP de démonstration locale. Crée une commande et consomme un billet."""
import http.cookiejar
import json
import os
import urllib.error
import urllib.parse
import urllib.request
import uuid

BASE = os.environ.get('SEATFLOW_URL', 'http://localhost:5173').rstrip('/')
PASSWORD = os.environ.get('DEMO_PASSWORD', 'demo1234')


class Client:
    def __init__(self):
        self.cookies = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies))

    def request(self, method, path, payload=None, key=None, form=False):
        headers = {}
        data = None
        if payload is not None:
            data = (urllib.parse.urlencode(payload) if form else json.dumps(payload)).encode()
            headers['Content-Type'] = 'application/x-www-form-urlencoded' if form else 'application/json'
        if method not in ('GET', 'HEAD'):
            token = next((cookie.value for cookie in self.cookies if cookie.name == 'XSRF-TOKEN'), None)
            if token:
                headers['X-XSRF-TOKEN'] = urllib.parse.unquote(token)
        if key:
            headers['Idempotency-Key'] = key
        request = urllib.request.Request(BASE + '/api' + path, data=data, headers=headers, method=method)
        try:
            response = self.opener.open(request, timeout=20)
        except urllib.error.HTTPError as error:
            response = error
        body = response.read()
        return response.status, json.loads(body) if body else None

    def login(self, username):
        assert self.request('GET', '/auth/csrf')[0] == 200
        assert self.request('POST', '/auth/login', {'username': username, 'password': PASSWORD}, form=True)[0] == 200
        assert self.request('GET', '/auth/csrf')[0] == 200
        status, account = self.request('GET', '/auth/me')
        assert status == 200 and account['username'] == username


def main():
    client, subscriber, checker = Client(), Client(), Client()
    client.login('client')
    subscriber.login('abonne')
    checker.login('controleur')
    assert client.request('GET', '/admin/report')[0] == 403
    status, events = client.request('GET', '/events')
    assert status == 200 and all(event['image_path'].startswith('/images/') for event in events)
    chosen_event = next(event for event in events if event['status'] == 'PUBLISHED' and event['available_seats'] > 0)
    status, detail = client.request('GET', f"/events/{chosen_event['id']}")
    assert status == 200
    seat = next(seat for seat in detail['seats'] if seat['status'] == 'AVAILABLE')
    payload = {'eventId': chosen_event['id'], 'seatIds': [seat['id']]}
    status, hold = client.request('POST', '/holds', payload)
    assert status == 200
    token = hold['token']
    status, holds = client.request('GET', '/holds')
    assert status == 200 and any(item['token'] == token and item['seat_ids'] == [seat['id']] for item in holds)
    assert subscriber.request('DELETE', f'/holds/{token}')[0] == 409
    assert client.request('DELETE', f'/holds/{token}')[0] == 204
    assert client.request('POST', '/orders', {'holdToken': token, 'paymentResult': 'success'}, str(uuid.uuid4()))[0] == 409
    status, hold = client.request('POST', '/holds', payload)
    assert status == 200
    key = str(uuid.uuid4())
    confirmation = {'holdToken': hold['token'], 'paymentResult': 'success'}
    status, order = client.request('POST', '/orders', confirmation, key)
    assert status == 200 and order['status'] == 'PAID'
    retry_status, retry = client.request('POST', '/orders', confirmation, key)
    assert retry_status == 200 and retry == order
    assert client.request('POST', '/orders', {**confirmation, 'paymentResult': 'decline'}, key)[0] == 409
    status, tickets = client.request('GET', '/tickets')
    matching = [ticket for ticket in tickets if ticket['event_id'] == chosen_event['id'] and ticket['row_label'] == seat['row_label'] and ticket['number'] == seat['number']]
    assert status == 200 and len(matching) == 1
    code = matching[0]['code']
    check = {'code': code, 'eventId': chosen_event['id']}
    assert checker.request('POST', '/checkin', check) == (200, {'result': 'VALID'})
    assert checker.request('POST', '/checkin', check) == (200, {'result': 'ALREADY_USED'})
    status, subscriber_tickets = subscriber.request('GET', '/tickets')
    assert status == 200 and len(subscriber_tickets) >= 2
    assert client.request('POST', '/auth/logout', {})[0] == 204
    assert client.request('GET', '/auth/me')[0] == 401
    print(json.dumps({'result': 'PASS', 'event_id': chosen_event['id'], 'event_seat_id': seat['id'], 'order_id': order['id'], 'ticket_id': matching[0]['id'], 'checks': ['session/CSRF', 'roles', 'catalogue/images', 'hold/reprise', 'ownership', 'release', 'payment', 'idempotency', 'ticket unique', 'checkin once', 'subscription tickets', 'logout']}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
