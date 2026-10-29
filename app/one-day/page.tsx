import { OneDayView } from "../../components/oneday/OneDayView";
import { DAY_DATA, FIRST_DAY } from "../../lib/oneday/data";
import "../play/play.css";
import "../agent.css";
import "./one-day.css";

export default function OneDayPage() {
  return <OneDayView day={DAY_DATA[FIRST_DAY]} />;
}
