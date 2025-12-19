# 20251218

```bash
npx create-next-app@latest

# cd into the project

npm install @capacitor/cli @capacitor/core

npx cap init
# [?] What is the name of your app?
#     This should be a human-friendly app name, like what you'd see in the App
#     Store.
# ✔ Name … my-app
# [?] What should be the Package ID for your app?
#     Package IDs (aka Bundle ID in iOS and Application ID in Android) are unique
#     identifiers for apps. They must be in reverse domain name notation,
#     generally representing a domain name that you or your company owns.
# ✔ Package ID … com.ourpot.app
# ✔ Creating capacitor.config.ts in /home/user1/house-kitty/my-app in 9.01ms
# [success] capacitor.config.ts created!

# Next steps: 
# https://capacitorjs.com/docs/getting-started#where-to-go-next
# [?] Join the Ionic Community! 💙
#     Connect with millions of developers on the Ionic Forum and get access to
#     live events, news updates, and more.
# ✔ Create free Ionic account? … no

# Thank you for helping improve Capacitor by sharing anonymous usage data! 💖
# Information about the data we collect is available on our website: https://capacitorjs.com/docs/next/cli/telemetry
# You can disable telemetry at any time by using the npx cap teleme

npm install --save @capacitor-community/sqlit

npx cap sync
# [error] The web assets directory (./public) must contain an index.html file.
#         It will be the entry point for the web portion of the Capacitor app.

# Fix: Configure Next.js for static export and update Capacitor config
# See doc/20251218-solution-capacitor-nextjs.md for details

npm run build

npx cap sync
# ✔ copy web in 4.75ms
# ✔ update web in 5.14ms
# [info] Sync finished in 0.022s

npm i @serwist/next && npm i -D serwist

npm uninstall @serwist/next && npm uninstall serwist

npm i @capacitor/android # @capacitor/ios maybe later

npx cap add android
# npx cap add ios

npx cap sync
```