import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mithril Docs — Usage Guides",
  description:
    "Learn how to integrate Mithril into your workflow via MCP, REST API, CLI demo, and benchmark suite.",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
