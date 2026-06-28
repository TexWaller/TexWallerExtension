# Privacy Policy for TexWaller AI Connector

Last updated: June 27, 2026

This Privacy Policy describes how TexWaller handles user data in the "TexWaller AI Connector" browser extension for Chrome, Firefox, Safari, and compatible browsers.

## 1. Data Controller

The data controller is:

TexWaller
Email: hello@texwaller.com
Website: https://texwaller.com

## 2. Purpose of the Extension

The extension is intended solely to help TexWaller complete an OAuth login flow with supported external AI providers.

The extension detects a valid OAuth flow started from TexWaller, captures the final local redirect URL, sends that redirect URL back to the original TexWaller tab, closes the redirect tab, and returns focus to TexWaller.

The extension is not affiliated with, sponsored by, endorsed by, or operated by OpenAI, unless expressly stated otherwise. OpenAI services are provided by OpenAI, and their use is subject to OpenAI's own terms and privacy policy.

## 3. Data Collected by the Extension

The extension does not collect, store, sell, or share users' personal data.

In particular, the extension does not collect:

- OpenAI or AI provider login credentials;
- passwords;
- session tokens;
- authentication cookies;
- contents of AI conversations;
- prompts or messages entered by the user;
- browsing history;
- contents of visited web pages;
- financial, health, or sensitive data;
- data used for advertising or profiling.

Login takes place through the provider's official pages and systems. The extension does not intercept or store the user's credentials.

## 4. Locally Stored Data

The extension temporarily stores technical OAuth flow state locally in the browser, such as the OAuth `state` value, related tab identifiers, and creation time. This data is used only to match the provider redirect with the TexWaller tab that started the flow.

This data remains on the user's device and is not transmitted to servers operated by TexWaller.

Temporary OAuth flow data expires automatically after a short time and can also be deleted by removing the extension or clearing the extension's data in the browser settings.

## 5. Browser Permissions

The extension requests only the permissions strictly necessary for its function.

The extension uses permissions such as:

- `storage`, to store temporary OAuth flow state locally in the browser;
- `tabs`, to identify, close, and focus the tabs involved in the OAuth flow;
- `webNavigation`, to detect relevant OAuth navigation and redirect events;
- host permissions for TexWaller pages, OpenAI authentication pages, and local redirect hosts required by the OAuth flow.

These permissions are not used to monitor the user's browsing activity or to collect unnecessary data.

## 6. Data Sharing

TexWaller does not share personal data collected by the extension with third parties, because the extension does not collect such data.

When the user accesses OpenAI or another supported provider, any data provided to that provider is processed directly by the provider according to its own notices and terms.

## 7. Analytics, Advertising, and Tracking

The extension does not use analytics, advertising cookies, profiling tools, beacons, tracking pixels, or similar technologies.

The extension does not sell personal data and does not use user data for personalized advertising.

## 8. Security

The extension is designed to minimize data processing. It does not store credentials, passwords, provider cookies, tokens, prompts, or the contents of AI conversations.

Any communications with external services, if introduced in future versions, will be described in this Privacy Policy.

## 9. User Rights

Because the extension does not collect personal data through the Controller's servers, we normally do not hold identifying data about the user.

For privacy-related requests, users may contact us at:

hello@texwaller.com

Where applicable, users in the European Economic Area may exercise the rights provided by the GDPR, including access, rectification, erasure, restriction, objection, and the right to lodge a complaint with the competent supervisory authority.

## 10. Children

The extension is not intended for children who do not meet the minimum age required to use ChatGPT or related services. The extension does not knowingly collect personal data from children.

## 11. Changes to This Privacy Policy

We may update this Privacy Policy to reflect technical, legal, or functional changes. The updated version will be published on this page with a new update date.

## 12. Contact

For questions about this Privacy Policy:

TexWaller
Email: hello@texwaller.com
Website: https://texwaller.com
