// app/page.tsx

import { requests } from "@/lib/store";

export default function Home() {
  return (
    <main style={{ padding: 20 }}>
      <h1>Captured Requests</h1>

      <pre>
        {JSON.stringify(requests, null, 2)}
      </pre>
    </main>
  );
}