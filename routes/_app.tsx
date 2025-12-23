import { define } from "../utils.ts";

export default define.page(function App({ Component, state }) {
  return (
    <html lang={state.locale} data-theme="autumn">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
});
