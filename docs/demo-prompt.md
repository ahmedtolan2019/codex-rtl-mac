# Private-data-free demo prompt

Use a new, projectless conversation. Copy only the prompt below. All names, prices, paths and addresses are fictional examples. This prompt asks for a fixed response so the model has no reason to use your account history, files or tools.

````text
This is a public screenshot demo for Arabic-English bidirectional rendering. Do not use tools, browse, read files, access memory, mention my name, or use any information from my account, projects or previous conversations.

Return exactly the Markdown below as your response, without introductory or concluding text and without wrapping the entire response in a code fence. Keep the table's source column order unchanged. Do not add HTML, direction-control characters, special spacing or extra formatting. Every example below is fictional.

# تجربة العربية والإنجليزية

هذه تجربة لقراءة العربية مع English في نفس السطر. نستخدم Nova API بالإصدار v2.3.1، وذاكرة 12 GB، ونسبة نجاح 98.5%. الكلمات والأرقام يجب أن تظل واضحة داخل الجملة.

## مقارنة خطط تجريبية

الأسعار التالية بيانات وهمية للعرض فقط.

| الاختيار | التكلفة الشهرية | الملاحظة |
| --- | --- | --- |
| [Atlas Cloud، ذاكرة 12 GB](https://example.com/atlas) | 1,250 جنيه | مناسب لتجربة Demo API |
| [CedarHost، ذاكرة 8 GB](https://example.com/cedar) | 950 جنيه | نسخة احتياطية كل 24 ساعة |
| [Orbit VM 2](https://example.com/orbit) | 1,800 جنيه | يدعم Node.js v24 |

## أسماء تقنية داخل العربية

افتح الملف `/demo/project/src/app.ts`، ثم شغّل `npm test`. راجع الرابط https://example.com/docs?q=rtl أو اكتب إلى demo@example.com. كل هذه أمثلة وهمية.

```js
const greeting = "مرحبًا بالعالم";
const memoryGB = 12;
console.log(greeting, `${memoryGB} GB`);
```

This English paragraph should stay left-to-right, even with the Arabic word مرحبًا inside it.
````

## Screenshots to contribute

1. Use the same response, app version, theme, window size and zoom for both captures. A fresh identical response is less useful because the model may change its markup.
2. For the baseline, quit the official app completely and open it normally. For the corrected view, save drafts and open Codex RTL for Mac. The launcher may quit and reopen the official app.
3. Hide the sidebar. Crop to the demo response, including the table and code block. Exclude your profile, thread list, projects, desktop, notifications, menu bar and any other conversation.
4. Inspect the images yourself before sharing. The prompt cannot hide personal UI outside the response.
5. Label them `codex-demo-before.png` and `codex-demo-after.png`. Record the public app version, macOS version and Intel or Apple silicon. Do not include diagnostic logs or your home-directory path.

The repository's browser preview is a synthetic fixture. Real app captures should be identified separately and published only after the contributor has reviewed them.
