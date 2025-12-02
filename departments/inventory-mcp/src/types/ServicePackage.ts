/**
 * Service Package Types
 * Các gói dịch vụ khám sức khỏe
 */

export type ServicePackage = 'gold' | 'basic' | 'silver';

export const SERVICE_PACKAGES: Record<ServicePackage, {
  name: string;
  nameVi: string;
  vtthColumn: number;  // Column index in VTTH sheet
  chemicalColumn: number;  // Column index in Hoa Chat Chi Tiet sheet
}> = {
  gold: {
    name: 'Gold Package',
    nameVi: 'Gói vàng',
    vtthColumn: 10,  // Column 10 in VTTH sheet
    chemicalColumn: 13  // Column 13 in Hoa Chat Chi Tiet sheet
  },
  basic: {
    name: 'Bronze Package',
    nameVi: 'Gói đồng',
    vtthColumn: 8,  // Column 8 in VTTH sheet
    chemicalColumn: 14  // Column 14 in Hoa Chat Chi Tiet sheet
  },
  silver: {
    name: 'Silver Package',
    nameVi: 'Gói bạc',
    vtthColumn: 12,  // Column 12 in VTTH sheet
    chemicalColumn: 15  // Column 15 in Hoa Chat Chi Tiet sheet
  }
};

export function isValidServicePackage(pkg: string): pkg is ServicePackage {
  return pkg === 'gold' || pkg === 'basic' || pkg === 'silver';
}

export function getServicePackageInfo(pkg: ServicePackage) {
  return SERVICE_PACKAGES[pkg];
}
