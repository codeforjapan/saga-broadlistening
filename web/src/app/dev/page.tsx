import type { Route } from "next";
import Link from "next/link";
import { previewRegistry } from "./_lib/registry";

export default function DevIndexPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-2">
        Component Gallery
      </h1>
      <p className="text-foreground mb-8">
        UIコンポーネントとfeatureコンポーネントを単体でプレビューできます。
      </p>

      <div className="grid gap-8">
        {previewRegistry.map((group) => (
          <section key={group.name}>
            <h2 className="text-xl font-bold text-foreground mb-4">
              {group.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.items.map((item) => (
                <Link
                  key={item.path}
                  href={item.path as Route}
                  className="block p-4 border border-border rounded-lg hover:bg-background transition-colors"
                >
                  <h3 className="font-medium text-foreground">{item.label}</h3>
                  <p className="text-sm text-foreground mt-1">
                    {item.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
