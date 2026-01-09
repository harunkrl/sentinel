
export const metadata = {
    title: "Sentinel Documentation",
    description: "Complete guide to installing, configuring, and maintaining the Sentinel monitoring system.",
};

export default function DocsLayout({ children }) {
    return (
        <div className="docs-layout">
            {children}
        </div>
    );
}
