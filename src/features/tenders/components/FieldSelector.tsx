import { Draggable, Droppable } from "@hello-pangea/dnd";
import { Icon } from "@iconify/react";

type Field = { label: string; key: string; icon: string };

export default function FieldSelector({
  fieldsOrder,
  selectedFields,
  handleFieldToggle,
  mode,
}: {
  fieldsOrder: Field[];
  selectedFields: Record<string, boolean>;
  handleFieldToggle: (key: string) => void;
  mode: "light" | "dark";
}) {
  return (
    <Droppable droppableId="fieldSelector">
      {(provided) => (
        <div ref={provided.innerRef} {...provided.droppableProps} className={`grid grid-cols-2 gap-4 p-2 ${mode === "dark" ? "bg-gray-700" : "bg-gray-100"} rounded-lg`}>
          {fieldsOrder.map((field, index) => (
            <Draggable key={field.key} draggableId={field.key} index={index}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className={`flex items-center justify-between p-2 rounded-md transition-colors duration-200 ${
                    snapshot.isDragging ? "bg-[#f05d23] text-white" : mode === "dark" ? "bg-gray-600 text-gray-200 hover:bg-gray-500" : "bg-white text-[#231812] hover:bg-gray-200"
                  }`}
                  style={{ ...provided.draggableProps.style, boxShadow: snapshot.isDragging ? "0 4px 6px rgba(0, 0, 0, 0.2)" : "none" }}
                >
                  <div className="flex items-center gap-2">
                    <Icon icon={field.icon} width={20} height={20} />
                    <span className="text-sm">{field.label}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedFields[field.key] || false}
                    onChange={() => handleFieldToggle(field.key)}
                    className={`form-checkbox h-5 w-5 text-[#f05d23] transition duration-200 ${mode === "dark" ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} rounded`}
                  />
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}
