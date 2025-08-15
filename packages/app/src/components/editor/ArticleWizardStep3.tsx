import React from "react";

interface Props {
  title: string;
  content: string;
  coverImage: string;
}

export default function ArticleWizardStep3({ title, content, coverImage }: Props) {
  return (
    <div>
      <h3 className="text-lg font-medium">Ready to publish</h3>
      <p className="text-sm text-text-secondary mt-2">Title: {title || "(no title)"}</p>
      <p className="text-sm text-text-secondary">Content length: {content.length} chars</p>
      {coverImage && (
        <p className="text-sm text-text-secondary">Cover image: {coverImage}</p>
      )}
    </div>
  );
}
