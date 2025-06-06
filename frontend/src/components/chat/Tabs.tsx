//@ts-nocheck

import { useDispatch, useSelector } from "react-redux";
import { addMessage, setTrigger } from "../../store/slices/chat.slice";

const Tabs = ({ tabs }) => {
  const { messages } = useSelector((state) => state.chat);
  const dispatch = useDispatch();

  return (
    <div className="px-4 py-3 flex flex-col gap-3">
      {tabs.map((tab, idx) => (
        <div
          key={idx}
          onClick={() => {
            dispatch(addMessage({ role: "user", content: tab.name }));
            dispatch(setTrigger());
          }}
          className="cursor-pointer bg-[#2b2b2f] hover:bg-[#3a3a40] text-white text-sm px-4 py-2 rounded-xl border border-[#3d3d42] shadow-md transition-all duration-200 flex items-center gap-2"
        >
          <span className="text-yellow-400">💡</span>
          <span className="truncate">{tab.name}</span>
        </div>
      ))}
    </div>
  );
};

export default Tabs;

const LOUNGE = [
  { name: "Club Mobay / Sangster Intl (SIA)", value: "SIA" },
  { name: "Club Kingston / Norman Manley Intl (NMIA)", value: "NMIA" },
];

const TabStrucutre = {
  name: "",
  value: "",
};
