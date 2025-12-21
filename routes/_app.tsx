import { define } from "../utils.ts";

export default define.page(function App({ Component }) {
  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="/styles.css" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
});
