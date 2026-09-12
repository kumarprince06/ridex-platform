# RideX B2C — Documentation Index

The engineering blueprint for RideX, and the record of what was built from it.

## Build order

1. 00-README.md
2. 01-Project-Overview.md
3. 02-Project-Requirements.md
4. 03-Use-Cases.md
5. 04-Business-Rules.md
6. 05-Functional-Requirements.md
7. 06-Non-Functional-Requirements.md
8. 07-Roles-and-Permissions.md
9. 08-Backend-Architecture.md
10. 09-Project-ERD.md
11. 10-API-Contract.md
12. 11-State-Machines.md
13. 12-Notification-Matrix.md
14. 13-Payment-Architecture.md
15. 14-Security.md
16. 15-Phase-Plan.md
17. 16-Edge-Cases-and-Errors.md
18. 17-RideX-Differentiators.md
19. 18-Future-Project-Ideas.md
20. 19-Technology-Stack.md
21. 20-ADRs.md
22. 34-Module-Task-Board.md
23. 22-Partner-App-Design.md
24. 23-Admin-Panel-Design.md

25. 24-HLD-High-Level-Design.md
26. 25-LLD-Low-Level-Design.md
27. 26-Build-Task-List.md
28. 27-Unique-Feature-Set.md
29. 31-Deployment-and-CI-CD.md
30. 32-Business-Readiness-and-New-Lines.md

## What is planning and what is built

01-27 were written before the code and describe the intended product. Three of them are now
generated from the code instead, because they are the ones that drift the moment it moves:

- [09-Project-ERD.md](09-Project-ERD.md) - from the Flyway migrations
- [10-API-Contract.md](10-API-Contract.md) - from the controllers
- [12-Notification-Matrix.md](12-Notification-Matrix.md) - from the templates and their call sites

`java tools/DocGen.java erd|api|notifications` regenerates them.

[34-Module-Task-Board.md](34-Module-Task-Board.md) is the plan of record for what is left.
