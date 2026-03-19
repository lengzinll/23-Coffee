
***
I want you to setup me a nextjs project with expose api out similar with hono then next js use swr to req those api 
***

*** Technologies ***

- Nextjs
- Tailwindcss
- Shadcn UI
- SWR or React Query
- TypeScript
- Bun as package manager
- DrizzleORM
- Sqlite
- Zod ( if can use drizzle-zod for validation schema convert on form so we can do one source of truth)
- Jotai as state management


*** Note: Combine back end with HonoJS ***
auth you can use library or just jwt then set to cookie  base on what you think

/form - create a form 

follow instrution here : 
ផ្នែកទី ១៖ ព័ត៌មានមូលដ្ឋាន (User Profile)
 * ឈ្មោះពេញ (Full Name): សម្រាប់ដាក់លើតារាងពិន្ទុ (Leaderboard)។
 * អាយុ (Age): ងាយស្រួលបែងចែកកីឡាករតាមកម្រិតអាយុ។
 * លេខទូរស័ព្ទ/Telegram: សម្រាប់ផ្ញើវីដេអូ Highlight ជូនគាត់វិញ។
 * ឈ្មោះអាខោន Facebook/TikTok: ដើម្បីឱ្យយើងដឹងពីសកម្មភាពរបស់គាត់។
ផ្នែកទី ២៖ កិច្ចការបង្កើន Fan (Call-to-Action)
មុននឹងចុច Submit ត្រូវតម្រូវឱ្យគាត់បំពេញកិច្ចការទាំងនេះ៖
 * Like Page: [Link ទៅ Page NSM ISP] និង [Link ទៅ Page Next Play Live]។
 * Join Group: [Link ទៅ Telegram Group NSM ISP] និង [Link ទៅ Telegram Group Next Play Live]។
 * បញ្ជាក់៖ ដាក់ប្រអប់ Tick Box មួយថា "ខ្ញុំបានបន្តតាមដាន និងចូលរួមគ្រប់ Channel រួចរាល់ហើយ"។
ផ្នែកទី ៣៖ ការយល់ព្រម (Terms & Consent)
 * សិទ្ធិរូបភាព៖ "ខ្ញុំយល់ព្រមឱ្យ Next Play Live ប្រើប្រាស់រូបភាព និងវីដេអូរបស់ខ្ញុំក្នុងការផ្សព្វផ្សាយ។"
ជំហានទី ២៖ ប្រព័ន្ធស្កេន និងការផ្ទៀងផ្ទាត់ (On-Site Verification)
១. Standee QR Code នៅច្រកចូល
 * រៀបចំ Standee ឱ្យធំច្បាស់ជាមួយពាក្យស្លោក៖ "ស្កេនចុះឈ្មោះលេង Challenge ដើម្បីឈ្នះរង្វាន់ និងបង្ហាញសមត្ថភាពលើ Live 4K!"។
២. ការបង្ហាញ QR Code ជោគជ័យ (The Confirmation Page)
នៅពេលគាត់ចុច Submit ក្នុង Google Form រួច ត្រូវឱ្យវាលោតសារដូចខាងក្រោមភ្លាមៗ៖
> "អបអរសាទរ! អ្នកចុះឈ្មោះជោគជ័យហើយ"
> ✅ សូមថតរូបអេក្រង់ (Screenshot) សារនេះ ឬ  QR Code ខាងក្រោម ដើម្បីបង្ហាញជូនក្រុមការងារនៅមាត់ច្រកចូលប្រកួត។
> [រូបភាព QR Code បញ្ជាក់ពីការចុះឈ្មោះជោគជ័យ]


/login - create a login page

/dashboard - create a dashboard page

- list all user 
- list regsiter user
- a page for logged in user can open camera to scan qr code ( in qr will have a userId for get back all info from back end when user register on form )


*** Database table ***
- user
- register

*** Seed ***
a seed file for seed data to db as defulat user

- username: admin
- password: admin
- role: admin