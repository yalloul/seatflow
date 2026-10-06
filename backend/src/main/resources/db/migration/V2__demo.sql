-- V2 runs only once on an empty demo database. Reset sequences after a rolled-back migration attempt.
SELECT setval('app_user_id_seq',1,false);
SELECT setval('venue_id_seq',1,false);
SELECT setval('hall_id_seq',1,false);
SELECT setval('sector_id_seq',1,false);
SELECT setval('seat_id_seq',1,false);
SELECT setval('season_id_seq',1,false);
SELECT setval('event_id_seq',1,false);
SELECT setval('tariff_id_seq',1,false);
SELECT setval('event_seat_id_seq',1,false);
SELECT setval('season_pass_id_seq',1,false);
SELECT setval('season_seat_assignment_id_seq',1,false);
SELECT setval('seat_hold_id_seq',1,false);
SELECT setval('customer_order_id_seq',1,false);
SELECT setval('order_item_id_seq',1,false);
SELECT setval('payment_attempt_id_seq',1,false);
SELECT setval('ticket_id_seq',1,false);
SELECT setval('ticket_check_in_id_seq',1,false);
SELECT setval('audit_entry_id_seq',1,false);
INSERT INTO app_user(username,role) VALUES ('client','CLIENT'),('abonne','CLIENT'),('prioritaire','CLIENT'),('organisateur','ORGANIZER'),('controleur','CHECKER'),('admin','ADMIN');
INSERT INTO venue(name) VALUES ('Complexe Atlas'),('Centre Horizon');
INSERT INTO hall(venue_id,name) VALUES (1,'Arena Atlas'),(2,'Théâtre Horizon');
INSERT INTO sector(hall_id,name,category) VALUES (1,'VIP','VIP'),(1,'Standard','STANDARD'),(1,'Accessible','ACCESSIBLE'),(2,'Orchestre','STANDARD'),(2,'Balcon','VIP');
INSERT INTO seat(hall_id,sector_id,row_label,number,x,y,accessible)
SELECT 1, CASE WHEN n<=8 THEN 1 WHEN n<=28 THEN 2 ELSE 3 END, CASE WHEN n<=8 THEN 'A' WHEN n<=18 THEN 'B' WHEN n<=28 THEN 'C' ELSE 'D' END, ((n-1)%10)+1, 80+((n-1)%10)*50, 80+((n-1)/10)*58,n>28 FROM generate_series(1,36) n;
INSERT INTO seat(hall_id,sector_id,row_label,number,x,y) SELECT 2,CASE WHEN n<=16 THEN 4 ELSE 5 END,CASE WHEN n<=8 THEN 'A' WHEN n<=16 THEN 'B' ELSE 'C' END,((n-1)%8)+1,100+((n-1)%8)*55,100+((n-1)/8)*65 FROM generate_series(1,24) n;
INSERT INTO season(name,starts_on,ends_on) VALUES ('Saison culturelle 2027','2027-01-01','2027-12-31');
INSERT INTO event(hall_id,season_id,title,description,starts_at,ends_at,occupied_start,occupied_end,priority_opens_at,public_opens_at) VALUES
(1,1,'Symphonie Atlas','Une soirée musicale à Arena Atlas.','2027-04-10 19:00+00','2027-04-10 21:00+00','2027-04-10 18:00+00','2027-04-10 21:30+00','2026-01-01 00:00+00','2026-01-02 00:00+00'),
(2,1,'Les Nuits Horizon','Théâtre contemporain.','2027-04-10 19:30+00','2027-04-10 21:30+00','2027-04-10 18:30+00','2027-04-10 22:00+00','2026-01-01 00:00+00','2026-01-02 00:00+00'),
(1,1,'Jazz des étoiles','Concert de jazz.','2027-05-15 19:00+00','2027-05-15 21:00+00','2027-05-15 18:00+00','2027-05-15 21:30+00','2026-01-01 00:00+00','2026-01-02 00:00+00'),
(2,NULL,'Comédie Horizon','Spectacle familial.','2027-05-20 18:00+00','2027-05-20 20:00+00','2027-05-20 17:00+00','2027-05-20 20:30+00',NULL,'2026-01-02 00:00+00');
INSERT INTO tariff(event_id,category,price) SELECT e.id,c.category,CASE c.category WHEN 'VIP' THEN 350.00 WHEN 'ACCESSIBLE' THEN 120.00 ELSE 180.00 END FROM event e JOIN sector c ON c.hall_id=e.hall_id GROUP BY e.id,c.category;
INSERT INTO event_seat(event_id,seat_id,price) SELECT e.id,s.id,t.price FROM event e JOIN seat s ON s.hall_id=e.hall_id JOIN sector c ON c.id=s.sector_id JOIN tariff t ON t.event_id=e.id AND t.category=c.category;
INSERT INTO season_pass(season_id,owner_id,type,seat_id) VALUES (1,2,'FIXED',1),(1,3,'PRIORITY',NULL);
UPDATE event_seat SET status='PASS',pass_owner=2 WHERE seat_id=1 AND event_id IN (1,3);
INSERT INTO season_seat_assignment(pass_id,event_id,event_seat_id) SELECT 1,event_id,id FROM event_seat WHERE seat_id=1 AND event_id IN (1,3);
INSERT INTO seat_hold(event_seat_id,owner_id,token,expires_at,status) SELECT id,2,'11111111-1111-4111-8111-111111111111',now()+interval '1 day','ACTIVE' FROM event_seat WHERE event_id=1 AND seat_id=2;
