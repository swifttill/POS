"use client";

import { TableDTO } from "@/components/TableMap";

interface TablesFloor {
  indoor: TableDTO[];
  patio: TableDTO[];
}

export function TablesFloorPlan({ indoor, patio }: TablesFloor) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-sm uppercase tracking-widest text-muted mb-2">Indoor</h3>
      <div className="grid grid-cols-3 gap-2">
        {indoor.map((table) => (
          <div
            key={table.id}
            className="table-item p-2 rounded-md border border-line text-center cursor-pointer hover:bg-panel-2 transition"
          >
            <span className="font-semibold">T{table.number}</span>
            <span className="text-xs text-muted">{table.seats} seats</span>
          </div>
        ))}
      </div>

      <h3 className="font-bold text-sm uppercase tracking-widest text-muted mb-2">Patio</h3>
      <div className="grid grid-cols-2 gap-2">
        {patio.map((table) => (
          <div
            key={table.id}
            className="table-item p-2 rounded-md border border-line text-center cursor-pointer hover:bg-panel-2 transition"
          >
            <span className="font-semibold">T{table.number}</span>
            <span className="text-xs text-muted">{table.seats} seats</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TablesScreenProps {
  onTableSelect: (table: TableDTO) => void;
}

export function TablesScreen({ onTableSelect }: TablesScreenProps) {
  // In a real app, this would fetch from the API
  const indoorTables: TableDTO[] = [
    { id: "t1", number: 1, name: null, seats: 2, zone: "Indoor", posX: 0, posY: 0 },
    { id: "t2", number: 2, name: null, seats: 4, zone: "Indoor", posX: 1, posY: 0 },
    { id: "t3", number: 3, name: null, seats: 4, zone: "Indoor", posX: 2, posY: 0 },
    { id: "t4", number: 4, name: null, seats: 2, zone: "Indoor", posX: 0, posY: 1 },
    { id: "t5", number: 5, name: null, seats: 4, zone: "Indoor", posX: 1, posY: 1 },
    { id: "t6", number: 6, name: null, seats: 2, zone: "Indoor", posX: 2, posY: 1 },
  ];

  const patioTables: TableDTO[] = [
    { id: "t7", number: 7, name: null, seats: 2, zone: "Patio", posX: 0, posY: 0 },
    { id: "t8", number: 8, name: null, seats: 4, zone: "Patio", posX: 1, posY: 0 },
  ];

  return (
    <div className="space-y-4">
      <TablesFloorPlan indoor={indoorTables} patio={patioTables} />
      <p className="text-center text-sm text-muted">
        Click a table to open/manage its order
      </p>
    </div>
  );
}