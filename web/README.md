## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## External app guidance

Set `SAGA_SUPER_APP_GUIDE_URL` in the web app environment to the city's approved
HTTP(S) page explaining how to answer from the Saga Super App. Users who do not
meet a theme's participation conditions see this link alongside the instructions.
When the variable is unset or invalid, the instructions appear without a link.
The page does not launch the app automatically; users open it and select the
named theme themselves.
