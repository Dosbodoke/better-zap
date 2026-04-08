import { EditIcon } from "../icons/edit";
import { buttonVariants } from "fumadocs-ui/components/ui/button";

export function EditPageButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={buttonVariants({
        color: "outline",
        size: "sm",
        className:
          "h-8 gap-1.5 rounded-md px-3 text-sm font-medium text-fd-muted-foreground",
      })}
    >
      <EditIcon className="size-3.5 shrink-0" />
      Edit this page
    </a>
  );
}
