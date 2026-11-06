import { toHash } from "./router";

type Props = { href: string; className?: string; children?: React.ReactNode };

export default function Link({ href, className, children }: Props) {
  return (
    <a href={toHash(href)} className={className}>
      {children}
    </a>
  );
}
