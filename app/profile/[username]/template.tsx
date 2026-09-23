import DelayedReveal from "@/app/components/delayed-reveal";
 
/*
 * Put this at app/profile/template.tsx
 *
 * Unlike layout.tsx, a template is re-mounted on every navigation,
 * so the loader runs each time /profile/[username] or
 * /profile/edit is opened.
 */
export default function ProfileTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DelayedReveal>{children}</DelayedReveal>;
}
 
