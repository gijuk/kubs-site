"use client";

import { useMemo, useState } from "react";
import { Link2 } from "lucide-react";
import {
  CAMPUS_BUILDINGS,
  FLOOR_CONNECTIONS,
  getBuilding,
  getConnectionsFor,
  type BuildingId,
  type FloorRef,
} from "@/lib/data/campusMap";

function buildingName(id: BuildingId): string {
  return getBuilding(id).name;
}

export default function CampusMapExplorer() {
  const [buildingId, setBuildingId] = useState<BuildingId>("main");

  const building = getBuilding(buildingId);
  const sortedFloors = useMemo(
    () => [...building.floors].sort((a, b) => b.order - a.order),
    [building]
  );

  const [floor, setFloor] = useState<string>(
    sortedFloors.find((f) => f.order === 1)?.floor ?? sortedFloors[0].floor
  );

  const currentFloor =
    sortedFloors.find((f) => f.floor === floor) ?? sortedFloors[0];

  const connections = getConnectionsFor({ building: buildingId, floor: currentFloor.floor });

  const jumpTo = (ref: FloorRef) => {
    setBuildingId(ref.building);
    const target = getBuilding(ref.building).floors.find(
      (f) => f.floor === ref.floor
    );
    setFloor(target?.floor ?? ref.floor);
  };

  const selectBuilding = (id: BuildingId) => {
    setBuildingId(id);
    const floors = getBuilding(id).floors;
    const sorted = [...floors].sort((a, b) => b.order - a.order);
    setFloor(sorted.find((f) => f.order === 1)?.floor ?? sorted[0].floor);
  };

  return (
    <div>
      {/* 건물 탭 */}
      <div className="flex flex-wrap gap-2">
        {CAMPUS_BUILDINGS.map((b) => (
          <button
            key={b.id}
            onClick={() => selectBuilding(b.id)}
            className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
              buildingId === b.id
                ? "border-crimson bg-crimson text-ivory"
                : "border-ivory-line text-ink-soft hover:border-crimson hover:text-crimson"
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-faint">
        {building.description}
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-[auto_1fr]">
        {/* 층 목록 (엘리베이터 패널 느낌) */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 md:flex-col md:overflow-visible">
          {sortedFloors.map((f) => (
            <button
              key={f.floor}
              onClick={() => setFloor(f.floor)}
              className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors md:w-16 md:text-center ${
                currentFloor.floor === f.floor
                  ? "bg-crimson text-ivory"
                  : "bg-ivory text-ink-soft hover:bg-ivory-line"
              }`}
            >
              {f.floor}
            </button>
          ))}
        </div>

        {/* 층 상세 */}
        <div className="rounded-lg border border-ivory-line bg-ivory p-6">
          <p className="font-serif text-lg font-semibold text-ink">
            {building.name} {currentFloor.floor}
          </p>

          {currentFloor.facilities.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {currentFloor.facilities.map((f) => (
                <li
                  key={f}
                  className="rounded-full bg-ivory-soft px-3 py-1.5 text-xs text-ink-soft"
                >
                  {f}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-xs text-ink-faint">
              등록된 시설 정보가 아직 없습니다.
            </p>
          )}

          {currentFloor.note && (
            <p className="mt-4 text-xs leading-relaxed text-ink-faint">
              {currentFloor.note}
            </p>
          )}

          {connections.length > 0 && (
            <div className="mt-5 space-y-2 border-t border-ivory-line pt-4">
              {connections.map(({ connection, other }) => (
                <button
                  key={`${other.building}-${other.floor}`}
                  onClick={() => jumpTo(other)}
                  className="flex w-full items-center gap-2 rounded-md bg-crimson-tint px-3 py-2 text-left text-xs text-crimson transition-colors hover:bg-crimson hover:text-ivory"
                >
                  <Link2 size={13} strokeWidth={1.75} className="shrink-0" />
                  <span>
                    {buildingName(other.building)} {other.floor}로 연결
                    {connection.note ? ` · ${connection.note}` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {building.note && (
        <p className="mt-4 text-xs leading-relaxed text-ink-faint">
          {building.note}
        </p>
      )}

      {/* 전체 연결 통로 한눈에 보기 */}
      <div className="mt-10 border-t border-ivory-line pt-6">
        <p className="text-sm font-medium text-ink">
          세 건물은 이렇게 연결되어 있어요
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {FLOOR_CONNECTIONS.map((c, i) => (
            <li key={i}>
              <button
                onClick={() => jumpTo(c.a)}
                className="flex w-full flex-wrap items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-ink-soft transition-colors hover:bg-ivory-soft hover:text-crimson"
              >
                <span className="font-medium">
                  {buildingName(c.a.building)} {c.a.floor}
                </span>
                <Link2 size={12} strokeWidth={1.75} />
                <span className="font-medium">
                  {buildingName(c.b.building)} {c.b.floor}
                </span>
                {c.note && (
                  <span className="text-ink-faint">· {c.note}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
