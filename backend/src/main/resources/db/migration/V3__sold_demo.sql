-- One reproducible sold seat for a fresh local demonstration database.
INSERT INTO customer_order(owner_id,event_id,hold_token,idempotency_key,status,total)
SELECT 1,4,'22222222-2222-4222-8222-222222222222','demo-sold-event-4','PAID',es.price
FROM event_seat es WHERE es.event_id=4 AND es.status='AVAILABLE' ORDER BY es.seat_id LIMIT 1;
INSERT INTO payment_attempt(order_id,result,external_key)
SELECT id,'PAID','demo-payment-event-4' FROM customer_order WHERE idempotency_key='demo-sold-event-4';
INSERT INTO order_item(order_id,event_seat_id,price)
SELECT o.id,es.id,es.price FROM customer_order o JOIN event_seat es ON es.event_id=o.event_id
WHERE o.idempotency_key='demo-sold-event-4' AND es.status='AVAILABLE' ORDER BY es.seat_id LIMIT 1;
UPDATE event_seat SET status='SOLD' WHERE id=(SELECT event_seat_id FROM order_item oi JOIN customer_order o ON o.id=oi.order_id WHERE o.idempotency_key='demo-sold-event-4');
INSERT INTO ticket(order_item_id,event_seat_id,event_id,owner_id,code,status)
SELECT oi.id,oi.event_seat_id,4,1,gen_random_uuid(),'ACTIVE' FROM order_item oi JOIN customer_order o ON o.id=oi.order_id WHERE o.idempotency_key='demo-sold-event-4';
INSERT INTO audit_entry(actor_id,action,entity_type,entity_id)
SELECT 1,'DEMO_SALE','EVENT_SEAT',event_seat_id FROM order_item oi JOIN customer_order o ON o.id=oi.order_id WHERE o.idempotency_key='demo-sold-event-4';
