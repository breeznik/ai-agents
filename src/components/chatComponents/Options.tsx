// components/ChatOptions.tsx
// @ts-nocheck

import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import { addMessage, setTrigger } from "../../store/slices/ChatReducer";
const fligtScheduleFilter = (scheduleData, selectedAirline) => {
  const filteredData = scheduleData.filter((schedule) => {
    if (schedule.airline === selectedAirline) {
      return true;
    }
    return false;
  });
  return filteredData;
};
const ChatOptions = ({ options }) => {
  const dispatch = useDispatch();
  const { messages } = useSelector((state) => state.chat);
  const [selectedAirlineIndex, setSelectedAirlineIndex] = useState(null);

  const handleAirlineChange = (e) => {
    const index = e.target.value;
    setSelectedAirlineIndex(index);
  };

  const handleScheduleClick = (option) => {;
      dispatch(addMessage({ role: "user", content: `${option.flightId}` ,  scheduleId:option.scheduleId }));
      dispatch(setTrigger());
  };

  return (
    <div className="px-4 py-3 flex flex-col gap-4 text-white">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-yellow-400">
          Select Airline
        </label>
        <select
          onChange={handleAirlineChange}
          value={selectedAirlineIndex ?? ""}
          className="bg-[#2b2b2f] border border-[#3d3d42] text-white px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          <option value="" disabled>
            Select an airline
          </option>
          {options.airlines.map((option, idx) => (
            <option key={idx} value={idx}>
              {option.description}
            </option>
          ))}
        </select>
      </div>

      {selectedAirlineIndex !== null && (
        <>
          <div className="text-base font-semibold text-yellow-400 border-b border-[#333] pb-2">
            ✈️ {options.airlines[selectedAirlineIndex].description} – Flight
            Schedule
          </div>

          <div className="flex flex-col gap-2">
            {fligtScheduleFilter(
              options.flightschedule,
              options.airlines[selectedAirlineIndex].description
            ).map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleScheduleClick(option)}
                className="flex items-center gap-2 text-left text-sm text-white bg-[#2b2b2f] hover:bg-[#3a3a40] px-4 py-2 rounded-xl border border-[#3d3d42] shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {option.flightId} – {option.targetDate} 
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ChatOptions;
