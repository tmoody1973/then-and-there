import { notFound } from "next/navigation";
import { OneDayView } from "../../../components/oneday/OneDayView";
import { DAY_DATA } from "../../../lib/oneday/data";
import "../../play/play.css";
import "../../agent.css";
import "../one-day.css";

export const generateStaticParams = () => Object.keys(DAY_DATA).map((slug) => ({ slug }));

export default async function OneDayDate({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const day = DAY_DATA[slug];
  if (!day) notFound();
  return <OneDayView day={day} />;
}
