MUHAI TASKS:

Reservations
1. Add SMS/text notification to the owner (Ate Sheena's phone) specifically for reservation-type orders (e.g., whole lechon for events), since email/response delays were a pain point.
   Categorize which items count as "reservation-priority" (large/made-to-order items) vs. regular in-store orders. - so the reservation
   notificaiton will go through to ate sheena phone is the medium or large only

Menu / Product Details
1. Add allergen information/tags to menu items.
2. Add ingredient lists to menu items (visible to both cashier/counter side and customer/guest side) — needed so customers can, e.g., know to remove peanuts from kare-kare.
3. Get the missing gram/weight measurements per dish from Ate Sheena (still pending, needs follow-up).
   Add categories in Settings (drop-down) that reflect on the front-end menu (e.g., drinks, lechon, etc.), including stock tracking that differs by category (grams for lechon vs. simple stock count for drinks).
4. New UI for customer account while ordering
5. add units when adding product as admin

Inventory
1. Populate/build out the currently near-empty inventory section (still just a placeholder/fill-in UI).
2. How food deduct every customer buy example the kare kare

Order Management Dashboard
1. Decide on and keep either the Pending/Confirmed/Preparing/Ready - Dropdown instead and also add filter icon for date 
2. Add an automatic trigger/notification when an order stays too long in "Preparing" status past an estimated time (auto-flag overdue orders instead of manual estimation calls).
3. Add a standard/default estimated waiting time per item, auto-added when an item is added to an order. - from ate sheena

Delivery / Pricing
1. free if order is lechon around tanza but food theres 60-80 but it was lalamove delivery (idk if i will integrate this)

UX
1. Lazy loading no more no cards show while loading and loading... text

Feedback
Add automatic filtering/rejection of feedback using a word-filter API (auto-reject inappropriate submissions) instead of manual reject/approve.

Rewards/Loyalty System
Finalize a rewards system design: points based on amount spent (not fixed items like "whole lechon"), similar to Starbucks' model — needs to avoid making the business lose money.
Make points-per-peso ratio editable/configurable in admin settings (not hardcoded).
Set up redemption flow: customer downloads/screenshots redemption confirmation, redeems in-store (delivery redemption also possible).
Display reward benefits during account registration.

Team/Roles
Rename "Team" tab to "Cashier" (or "Cashier account") — current naming was unclear/undecided.

Support Chat
Simplify the support/inquiry chat notification UI — make it more accessible (chat/messenger-style with a close button) rather than the current design.

Admin Panel / Appearance Settings
Make sure all homepage elements (colors, icons, pictures, location, etc.) are dynamic and editable via a simple interface — not manual/code-level editing, since the client isn't technical.
Move/consolidate the appearance editor into Settings tab for easier access.

Store Status
Move "Store Status" (open/close) control into Settings for easier access.
Add a clear alert/notification on the website (landing page and "Order Now" page) when the store is currently closed — a real dialog/prompt, not just a subtle "currently closed" tag, since users tend to miss subtle indicators.
When store is closed, customers should still be able to view the menu (marked unavailable) but not place orders.

Reporting
Add a Sales/Reporting section to the dashboard (currently missing) — needs monthly reports.
Make reports downloadable and printable.


- LECHON Loading ICON animation






PRIORITY TASKS: 
5. Every completed order the receipt will send to customer email 8. admin must power to end or delete the conversation from reviews if bad happens like a troll customer 4. Progress order UI - Interactive; admin or cashier can update status, e.g., "on the way" or "already delivered." and borj problem like cancelling 6. Dashboard dropdown for report (that summarize in dashboard) (prototype) 13. Change ui of menu ui and slug ui per product - development gc reference

7. connect the online offline of cashier using poll
8. Payment system - UI and functionality.
9. Inventory way of deducting - grams, kilograms and per pieces etc,.
10. Mobile app for cashier/owner/customer.

- cashier mobile app available in offline
- if no connections from cashier and web app the menu will be triggered as unavailable righht now sign as closed

11. sms - for admin for stock alerts, reservation type / for customer for delivery that their order is on the way
12. paymongo for payment customers
13. add animation in homepage

QA:

1. No lazy loading in all images that showed in screen for better user experience
2. change the format of hero section and /order/ui layout for much modern ui experience
3. Notifications
4. sms - for admin for stock alerts, reservation type / for customer for delivery that their order is on the way
5. Duplicate err msgs
6. Appearance still lot of improvements
7. Promo clickable offers from homepage of users

New repository - cashier mobile app apk (this was connected to online order if the connection cut maybe the cashier dont have internet so online ordering will be unavailable in website and ask customer to contact in facebook instead and wait for reply from them if theres ordering available)

1. expo go setup - ✔
2. app if online ask cashier acct login if offline connection the app use just save offline whos cashier is logged in
3. if online all orders data, transactions etc will saved online mongodb
4. if offline it will saved in sqlite and back to online it will saved all data that stored offline to mongodb and deelete the data in offline

fix/development (new branch):

1. Images skeleton in homepage with lazy loading
2. Promo clickable offers
3. remove scroll to see more offers if no much enough data
4. make it no promos if no promo active
5. confirmation order ui (must matched to jollibee)
6. adding new cashier raw error
7. fixed delivery fee

additional if only possible:

1. customer can leave a feedback thru trustpilot and system fetch data from all review there
2. in address if user select it, they can add details and save to user address details also, if user add that his house is red etc,.
3. customer support, floating circle in left bottom and if click it can chat to donclaudios cashier or owner can answer it, it also have faq for customer
4. reservation/event calendar for owner/admin

Proposal suggestions:
1 Security confirmation call
2 Dashboard dropdown for report (that summarize in dashboard)
3 Apk for cashier pos
4 Id per order of customer
5 Transactions done by cashiers
6 Sales report detailed
7 No more admin
8 Receipt printer that connected to apk

Need to clarify to owner that if the pos will be used it must register to BIR
