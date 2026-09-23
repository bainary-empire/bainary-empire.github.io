# BAI Personnel Portal v22

Updated Personnel Portal authentication to use personnel accounts stored in the shared `baiPersonnelAccounts` localStorage registry created by the BAI Admin Portal.

Personnel accounts are created by the Admin Portal. The default prototype personnel accounts are seeded automatically if no registry exists.

New personnel accounts use a generated temporary password and are required to change it after first login. Disabled personnel accounts cannot sign in.
