-- The launch text for the legal pages, replacing V39's placeholders.
--
-- Only rows still holding a placeholder are touched, so a page operations has already edited in
-- the console is never overwritten by a deploy. Figures quoted here (fees, windows, refund rates)
-- are the ones platform_settings and cancellation_policies ship with; change both together.

UPDATE legal_documents
SET title = 'Privacy Policy', updated_at = now(), body = $doc$# Privacy Policy

RideX is operated by Ridex Transport Solution, Belur, Howrah, Kolkata, West Bengal - 711202, India ("RideX", "we", "us"). This policy explains what personal data we collect when you use the RideX rider app, the RideX Partner app or our services, why we collect it, and the choices you have. It is written to meet the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000.

# What we collect

Account details: your name, email address, phone number and password (stored only as a secure hash).

Location: for riders, the pickup and drop-off points you choose and your location while a ride is being arranged or is in progress. For drivers, your location while you are on duty or on a trip, so riders can be matched and see you arrive. We do not track drivers who are off duty.

Trip and booking records: rides and shuttle seats you book, routes, times, fares, cancellations, ratings and the boarding code checks on shuttles.

Payments: the amount, method and status of each payment. Card and UPI details are handled by our payment partner Razorpay; we never see or store your full card number or UPI PIN.

Driver verification (drivers only): driving licence, vehicle registration, insurance and other documents you upload, your vehicle details and your bank or UPI details for payouts.

Device and usage data: the device you sign in from, IP address, sign-in history and a notification token so we can send you trip updates.

Support: messages you send us and the details of any issue you report.

# Why we use it

To create and secure your account, match riders with drivers and shuttles, show live trip progress, calculate and collect fares, pay drivers, verify that drivers are licensed and vehicles are roadworthy, send receipts and trip updates, handle support requests and disputes, prevent fraud and misuse, and meet our legal and tax obligations.

# Who we share it with

With the other person on your trip: a rider sees the driver's name, rating, vehicle, number plate and live location; a driver sees the rider's name, pickup and drop-off.

With service providers who work for us: Razorpay for payments, our email and notification providers, and map providers for routes and addresses. They may use the data only to provide their service to us.

With authorities, when the law requires it or when it is needed to protect someone's safety.

We do not sell your personal data.

# How long we keep it

We keep personal data only as long as we need it for the purposes above, or as long as the law requires. Trip, payment and invoice records are kept for up to 8 years because tax law requires it, including after an account is closed.

# Your rights

You can ask us to show you the personal data we hold about you, correct it, or delete your account. Some records (for example invoices) must be kept even after deletion because the law requires it. You can turn off promotional notifications in the app's settings at any time. To use any of these rights, write to support@ridex.com from the email on your account.

# Security

Passwords are hashed, the apps talk to our servers only over encrypted connections, and staff access to personal data is limited by role and recorded in an audit log.

# Grievance Officer

If you have a concern about how your data is handled, contact our Grievance Officer:

Prince Sharma
Email: kumarprince.s0611@gmail.com
Ridex Transport Solution, Belur, Howrah, Kolkata, West Bengal - 711202

We will acknowledge your complaint within 24 hours and resolve it within 15 days.

# Changes

If we change this policy we will update it here, and tell you in the app when the change is significant.$doc$
WHERE slug = 'privacy-policy' AND body LIKE '%placeholder%';

UPDATE legal_documents
SET title = 'Terms of Service', updated_at = now(), body = $doc$# Terms of Service

These terms govern your use of the RideX rider app and services, operated by Ridex Transport Solution, Belur, Howrah, Kolkata, West Bengal - 711202 ("RideX"). By creating an account you agree to them.

# The service

RideX connects you with independent drivers for on-demand rides, and runs scheduled shuttles on fixed routes where you book a seat in advance. Drivers are independent partners, not RideX employees.

# Your account

You must be at least 18 years old and give accurate details. Keep your password private; you are responsible for rides booked from your account. We may suspend accounts used for fraud, abuse or unsafe behaviour.

# Fares and payment

For rides, the app shows an estimated fare before you book. The final fare is calculated from the actual distance and time of the trip and may differ from the estimate. You can pay online or in cash to the driver, as offered in the app. Any unpaid fare must be settled before you can book again.

Shuttle seats are prepaid online when you book. A seat is held for 10 minutes while you pay; if payment does not complete in that time the seat is released.

# Cancellations

Ride and shuttle cancellations, no-show fees and refunds are explained in our Refund and Cancellation Policy, which forms part of these terms.

# RideX points

You earn points on completed rides and through referrals, and can spend them on fares. Points have no cash value, cannot be transferred or exchanged for money, and are removed if they were earned through fraud. We may change how points are earned or spent with notice in the app.

# Shuttle rules

Be at your boarding stop before the scheduled time; the shuttle does not wait. Show your boarding pass (QR or 6-digit code) to the driver. A seat is for the booked rider only, between the booked stops.

# Conduct

Treat drivers and other passengers with respect. Do not carry illegal or dangerous items, smoke, or damage the vehicle. You are responsible for the cost of any damage you cause.

# Safety and liability

Drivers are verified before they can take rides, but RideX is not liable for events outside our reasonable control. To the extent the law allows, our total liability for any claim is limited to the fare of the trip it relates to.

# Complaints

Report any problem from the trip in the app, or write to support@ridex.com. Our Grievance Officer is Prince Sharma (kumarprince.s0611@gmail.com).

# Governing law

These terms are governed by the laws of India. Any dispute is subject to the exclusive jurisdiction of the courts at Howrah, West Bengal.

# Changes

We may update these terms. If a change is significant we will tell you in the app; continuing to use RideX after that means you accept the new terms.$doc$
WHERE slug = 'rider-terms' AND body LIKE '%placeholder%';

UPDATE legal_documents
SET title = 'Partner Terms', updated_at = now(), body = $doc$# Partner Terms

These terms govern your use of the RideX Partner app as a driver, operated by Ridex Transport Solution, Belur, Howrah, Kolkata, West Bengal - 711202 ("RideX"). You drive with RideX as an independent partner, not as an employee.

# Joining

You must hold a valid Indian driving licence for your vehicle class, and your vehicle must have valid registration, insurance and permits. Upload these documents in the app; you can take rides only after we approve them. Keep them up to date - an expired document can suspend your account until it is renewed.

# Rides and shuttles

When you are on duty you will receive ride offers you can accept or ignore. Once accepted, drive to the pickup, confirm the rider with their pickup code, and follow the route to the destination. For shuttle runs, start the run in the app, check each passenger in with their QR or 6-digit code, and keep the app open so stops are marked as you reach them.

# Fares, commission and payouts

Fares are calculated by RideX. RideX keeps a platform commission of 20% of each fare; the rest is your earning. Cash you collect from riders is recorded against your wallet, because the platform commission on those trips is still owed. Online fares are paid out to your registered bank account or UPI ID in payout batches.

# Your wallet

Your wallet balance shows what you owe RideX or what RideX owes you. If your balance falls below -Rs 50 you cannot go on duty or receive offers until you recharge it through the app.

# Cancellations

You may cancel an accepted ride without charge within 60 seconds of accepting it. After that, a cancellation costs Rs 20, taken from your wallet. Cancelling is always free when you report the situation as unsafe. If you wait at the pickup for at least 5 minutes and the rider does not come, you can cancel for a no-show without charge; the rider pays a no-show fee and you receive 80% of it. You also receive 80% of any late-cancellation fee a rider pays for a ride you were driving to.

# Conduct and safety

Drive safely and lawfully, keep your vehicle clean and roadworthy, and treat riders with respect. Do not ask riders for payment outside the app's fare. RideX may suspend or remove partners for unsafe driving, fraud, repeated cancellations or complaints.

# Taxes

You are responsible for your own income tax and any GST that applies to your earnings.

# Complaints

Write to support@ridex.com. Our Grievance Officer is Prince Sharma (kumarprince.s0611@gmail.com).

# Governing law

These terms are governed by the laws of India. Any dispute is subject to the exclusive jurisdiction of the courts at Howrah, West Bengal.$doc$
WHERE slug = 'partner-terms' AND body LIKE '%placeholder%';

INSERT INTO legal_documents (slug, title, body) VALUES ('refund-policy', 'Refund and Cancellation Policy', $doc$# Refund and Cancellation Policy

This policy explains when you can cancel, what it costs and how refunds work. It is part of the RideX Terms of Service.

# Cancelling a ride

While we are still finding you a driver, cancelling is free.

After a driver has accepted, you can cancel free of charge within 2 minutes. After that, a Rs 30 cancellation fee applies.

Once the driver has arrived at the pickup, cancelling costs Rs 50. If the driver waits at least 5 minutes and you do not come, the driver may cancel the ride and a Rs 50 no-show fee applies.

Most of any cancellation or no-show fee goes to the driver who drove to you.

If the driver cancels, you are never charged.

# Cancelling a shuttle seat

You can cancel a paid shuttle seat until 30 minutes before the shuttle leaves. 80% of the amount you paid comes back to you as RideX points, which you can spend on your next ride or seat. After that cut-off, seats cannot be cancelled and are not refunded, including if you miss the shuttle.

Seats covered by a pass can be cancelled until the same cut-off; the ride goes back onto your pass.

If RideX cancels a shuttle departure, you get a full refund of what you paid.

# Refunds to your bank or card

Refunds of online payments go back to the card, UPI or account you paid from, through our payment partner Razorpay. They normally reach you within 5 to 7 working days.

If you paid for a seat after its 10-minute hold had already ended and the seat was released, the payment is refunded in full automatically.

If you were charged twice or charged wrongly, report it from the trip in the app or write to support@ridex.com, and we will refund the extra amount once confirmed.

# Passes

Shuttle passes are non-refundable once active.

# Contact

support@ridex.com
Grievance Officer: Prince Sharma (kumarprince.s0611@gmail.com)
Ridex Transport Solution, Belur, Howrah, Kolkata, West Bengal - 711202$doc$)
ON CONFLICT (slug) DO NOTHING;
