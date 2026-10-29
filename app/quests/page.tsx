import { type QuestSource, QuestView } from "../../components/quests/QuestView";
import data from "../../data/quests/great-migration.json";
import "../play/play.css";
import "../agent.css";
import "./quests.css";

export default function QuestsPage() {
  return <QuestView sources={data.sources as QuestSource[]} />;
}
