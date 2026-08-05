'use client';

import { Icon } from "@iconify/react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

interface Field {
    key: string;
    label: string;
    icon: string;
}

interface FieldSelectorProps {
    fieldsOrder: Field[];
    selectedFields: Record<string, boolean>;
    handleFieldToggle: (key: string) => void;
    mode: "light" | "dark";
}

export default function FieldSelector({
    fieldsOrder,
    selectedFields,
    handleFieldToggle,
    mode,
}: FieldSelectorProps) {
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setPortalContainer(document.body);
    }, []);

    return (
        <Droppable droppableId="fieldSelector">
            {(provided) => (
                <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="grid grid-cols-2 gap-4 max-h-60 overflow-y-auto p-2 pr-3"
                    style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#9CA3AF #E5E7EB',
                    }}
                >
                    {fieldsOrder.map((field, index) => (
                        <Draggable key={field.key} draggableId={field.key} index={index}>
                            {(provided, snapshot) => {
                                const element = (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={`flex items-center gap-2 p-2 rounded-lg transition-shadow ${mode === "dark"
                                            ? "bg-gray-700 text-white border border-gray-600"
                                            : "bg-white text-gray-900 border border-gray-200"
                                            } ${snapshot.isDragging
                                                ? "shadow-xl border-gcg-orange opacity-90"
                                                : "shadow-sm"
                                            }`}
                                        style={provided.draggableProps.style}
                                    >
                                        <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                            <Icon
                                                icon="solar:hamburger-menu-broken"
                                                className={`w-4 h-4 ${mode === "dark" ? "text-gray-400" : "text-gray-500"
                                                    }`}
                                            />
                                        </div>
                                        <label className="flex items-center gap-2 flex-1 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedFields[field.key]}
                                                onChange={() => handleFieldToggle(field.key)}
                                                className={`h-4 w-4 text-gcg-orange border rounded focus:ring-gcg-orange focus:ring-2 cursor-pointer ${mode === "dark"
                                                    ? "border-gray-500 bg-gray-700 checked:bg-gcg-orange checked:border-gcg-orange"
                                                    : "border-gray-300 bg-white checked:bg-gcg-orange checked:border-gcg-orange"
                                                    }`}
                                            />
                                            <Icon
                                                icon={field.icon}
                                                className={`w-4 h-4 ${mode === "dark" ? "text-gcg-orange-dark" : "text-gcg-orange"
                                                    }`}
                                            />
                                            <span
                                                className={`text-sm ${mode === "dark"
                                                    ? "text-white"
                                                    : "text-gray-900"
                                                    }`}
                                            >
                                                {field.label}
                                            </span>
                                        </label>
                                    </div>
                                );

                                return snapshot.isDragging && portalContainer
                                    ? createPortal(element, portalContainer)
                                    : element;
                            }}
                        </Draggable>
                    ))}
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
    );
}
