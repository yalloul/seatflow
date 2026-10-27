-- A fixed subscription must also provide an admission credential for each assigned event.
-- order_item_id remains null: the entitlement comes from a season pass, not a retail order.
INSERT INTO ticket(event_seat_id,event_id,owner_id,code,status)
SELECT assignment.event_seat_id,assignment.event_id,pass.owner_id,gen_random_uuid(),'ACTIVE'
FROM season_seat_assignment assignment JOIN season_pass pass ON pass.id=assignment.pass_id
WHERE NOT EXISTS (SELECT 1 FROM ticket t WHERE t.event_seat_id=assignment.event_seat_id);
