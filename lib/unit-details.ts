export type UnitDetails = {
  floorAreaSquareFeet: number;
  unitType: string;
  parkingBay?: string;
};

const detailsByUnit: Record<string, UnitDetails> = {
  "A-01-03": { floorAreaSquareFeet: 5943, unitType: "A2b", parkingBay: "LG3 7, 8, 9" },
  "A-01-3A": { floorAreaSquareFeet: 5943, unitType: "A2b", parkingBay: "LG3 33, 34, 35" },
  "A-02-03": { floorAreaSquareFeet: 5351, unitType: "A2", parkingBay: "LG3 75, 76, 77" },
  "A-02-05": { floorAreaSquareFeet: 4489, unitType: "B", parkingBay: "LG3 16, 17, 18" },
  "A-02-3A": { floorAreaSquareFeet: 5351, unitType: "A2", parkingBay: "LG3 82, 83, 84" },
  "A-03-01": { floorAreaSquareFeet: 5253, unitType: "A1", parkingBay: "LG3 4, 5, 6" },
  "A-03-03": { floorAreaSquareFeet: 5351, unitType: "A2", parkingBay: "LG3 72, 73, 74" },
  "A-03-05": { floorAreaSquareFeet: 4489, unitType: "B", parkingBay: "LG3 39, 40, 41" },
  "A-03-3A": { floorAreaSquareFeet: 5351, unitType: "A2", parkingBay: "LG3 89, 90, 91" },
  "A-05-03": { floorAreaSquareFeet: 5351, unitType: "A2", parkingBay: "LG3 69, 70, 71" },
  "A-07-05": { floorAreaSquareFeet: 4489, unitType: "B", parkingBay: "LG2 25, 26, 27" },
  "A-15-03": { floorAreaSquareFeet: 5351, unitType: "A2", parkingBay: "LG1 54, 55, 56" },
  "A-G-01": { floorAreaSquareFeet: 7201, unitType: "D", parkingBay: "LG2 106, 107, 108, 109" },
  "A-G-02": { floorAreaSquareFeet: 5856, unitType: "E", parkingBay: "LG1 1, 2, 3, 4" },
  "A-G-03": { floorAreaSquareFeet: 6383, unitType: "F", parkingBay: "LG1 89, 90, 91, 92" },
  "B-01-01": { floorAreaSquareFeet: 1894, unitType: "G2", parkingBay: "LG4 80, 81" },
  "B-01-02": { floorAreaSquareFeet: 1894, unitType: "H2", parkingBay: "LG4 3, 4" },
  "B-01-03": { floorAreaSquareFeet: 1894, unitType: "G1", parkingBay: "LG4 82, 83" },
  "B-01-04": { floorAreaSquareFeet: 1894, unitType: "H1", parkingBay: "LG4 1, 2" },
  "B-02-02": { floorAreaSquareFeet: 1894, unitType: "H2", parkingBay: "LG4 76, 77" },
  "B-02-04": { floorAreaSquareFeet: 1894, unitType: "H1", parkingBay: "LG4 5, 6" },
  "B-03-04": { floorAreaSquareFeet: 1894, unitType: "H1", parkingBay: "LG4 9, 10" },
  "B-05-04": { floorAreaSquareFeet: 1894, unitType: "H1", parkingBay: "LG4 68, 69" },
  "B-06-03": { floorAreaSquareFeet: 1894, unitType: "G1", parkingBay: "LG4 13, 14" },
  "B-08-01": { floorAreaSquareFeet: 1894, unitType: "G2", parkingBay: "LG4 42, 43" },
  "B-13A-03": { floorAreaSquareFeet: 1894, unitType: "G1", parkingBay: "LG2 114, 115" },
  "B-13-04": { floorAreaSquareFeet: 1894, unitType: "H1", parkingBay: "LG2 48, LG3 78" },
  "B-15-01": { floorAreaSquareFeet: 1894, unitType: "G2", parkingBay: "LG2 84, 85, 86" },
  "B-3A-03": { floorAreaSquareFeet: 1894, unitType: "G1", parkingBay: "LG4 74, 75" },
  "B-3A-04": { floorAreaSquareFeet: 1894, unitType: "H1", parkingBay: "LG4 72, 73" },
};

export const squareFeetToSquareMetres = (squareFeet: number) =>
  Math.round(squareFeet * 0.09290304);

export const detailsForUnit = (unit: string) =>
  detailsByUnit[unit.trim().toUpperCase()];
