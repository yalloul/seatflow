-- Additive migration: keep existing demo and customer data.
ALTER TABLE event ADD COLUMN image_path TEXT NOT NULL DEFAULT '/images/seatflow-hero.png';
UPDATE event SET image_path = CASE id
    WHEN 1 THEN '/images/symphonie-atlas.png'
    WHEN 2 THEN '/images/nuits-horizon.png'
    WHEN 3 THEN '/images/jazz-etoiles.png'
    WHEN 4 THEN '/images/comedie-horizon.png'
    ELSE '/images/seatflow-hero.png' END;
ALTER TABLE seat_hold DROP CONSTRAINT seat_hold_status_check;
ALTER TABLE seat_hold ADD CONSTRAINT seat_hold_status_check
    CHECK (status IN ('ACTIVE', 'CONSUMED', 'EXPIRED', 'RELEASED'));
ALTER TABLE customer_order ADD COLUMN payment_result TEXT;
UPDATE customer_order SET payment_result = CASE status WHEN 'PAID' THEN 'success' ELSE 'decline' END;
ALTER TABLE customer_order ALTER COLUMN payment_result SET NOT NULL;
ALTER TABLE customer_order ADD CONSTRAINT order_payment_result CHECK (payment_result IN ('success', 'decline'));
CREATE INDEX hold_owner_token ON seat_hold(owner_id, token);
