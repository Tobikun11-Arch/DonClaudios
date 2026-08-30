PRIORITY TASKS:
1. Appearance - All content in Public should be from the database, so it's CRUD. 
  - cant type in bg color input - DONE
  - text color changing is not working - DONE
  - the bg white default from highlights and about section is not changing - the color picker is not working in white bg in current appearance - 
  - the toast loop error when changing and it must automatic close not the admin need to x it 

2. Feedback - Customer account and guest feedback on the home page; admin can approve and reply to customer concerns. - ...
   - create a crud in customer account for giving a review
   - create a read reviews for admin and accept review for a good review and can reply to a customer concern
     if the review is bad at all so owner can compensate first and give new review again
   - the reviews will fetch in /homepage



3. Closed hours - Automatically disable ordering for guest and customer accounts; admin can also manually close hours if there's ever an emergency and they're not available.
4. Progress order UI - Interactive; admin or cashier can update status, e.g., "on the way" or "already delivered." and borj problem like  cancelling
5. Delivery fee - Must be displayed in the cart so the customer knows the total amount, and also displayed in the order confirmation.
6. Payment system - UI and functionality.
7. Inventory way of deducting - grams, kilograms and per pieces etc,.
8. Customer account - Profile tab.
9. Notification for admin and customer account
10. Mobile app for cashier and admin.





QA:
1. No lazy loading in all images that showed in screen for better user experience
2. change the format of hero section and /order/ui layout for much modern ui experience
3. Notifications
4. sms
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
 


additional if only possible:
1. customer can leave a feedback thru trustpilot and system fetch data from all review there
2. in address if user select it, they can add details and save to user address details also, if user add that his house is red etc,.
3. customer support, floating circle in left bottom and if click it can chat to donclaudios cashier or owner can answer it, it also have faq for customer
4. reservation/event calendar for owner/admin
5. 





















Proposal suggestions:
1 Security confirmation call
2 Dashboard dropdown for report (that summarize in dashboard)
3 Apk for cashier pos
4 Id per order of customer
5 Transactions done by cashiers
6 Sales report detailed
7 No more admin
8 Receipt printer that connected to apk

Need to clarify to owner that if the pos will be used it must register to bir