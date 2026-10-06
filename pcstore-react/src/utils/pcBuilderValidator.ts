import type { BuilderProduct, ProductSpecs } from "../data/builderProducts";

export interface CompatibilityIssue {
  id: string;
  ruleName: string;
  message: string;
  affectedSlots: number[];
}

export const SLOT_NAME_MAP: Record<number, string> = {
  1: "CPU",
  2: "Mainboard",
  3: "RAM",
  4: "VGA",
  5: "SSD",
  6: "HDD",
  7: "PSU",
  8: "Tản Nhiệt",
  9: "Case",
  10: "Fan",
};

export function getProductSpecs(product: BuilderProduct): ProductSpecs {
  const specs: ProductSpecs = { ...product.specs };
  const title = product.title || "";

  if (!specs.socket) {
    if (/AM4/i.test(title)) specs.socket = "AM4";
    else if (/AM5/i.test(title)) specs.socket = "AM5";
    else if (/LGA\s*1700/i.test(title)) specs.socket = "LGA 1700";
    else if (/LGA\s*1200/i.test(title)) specs.socket = "LGA 1200";
  }

  if (!specs.ramType) {
    if (/DDR5|D5/i.test(title)) specs.ramType = "DDR5";
    else if (/DDR4|D4/i.test(title)) specs.ramType = "DDR4";
  }

  if (product.slotIndex === 1 && !specs.tdp) {
    specs.tdp = 65;
  } else if (product.slotIndex === 2) {
    specs.tdp = 30;
  } else if (product.slotIndex === 3) {
    specs.tdp = 5;
  } else if (product.slotIndex === 4 && !specs.tdp) {
    specs.tdp = 150;
  } else if (product.slotIndex === 5 || product.slotIndex === 6) {
    specs.tdp = 5;
  } else if (product.slotIndex === 8) {
    specs.tdp = specs.coolerType === "AIO" ? 15 : 10;
  } else if (product.slotIndex === 10) {
    specs.tdp = 5;
  } else if (product.slotIndex === 7 || product.slotIndex === 9) {
    specs.tdp = 0;
  }

  if (product.slotIndex === 7 && !specs.wattage) {
    const match = title.match(/(\d{3,4})\s*w/i) || title.match(/(\d{3,4})/i);
    if (match) {
      const val = parseInt(match[1], 10);
      if (val >= 250 && val <= 2500) specs.wattage = val;
    }
  }

  if (product.slotIndex === 4 && !specs.recommendedPsu) {
    if (/4090/i.test(title)) specs.recommendedPsu = 850;
    else if (/4080|7900/i.test(title)) specs.recommendedPsu = 750;
    else if (/4070|7800/i.test(title)) specs.recommendedPsu = 650;
    else if (/4060|3060|6700|7600/i.test(title)) specs.recommendedPsu = 550;
    else specs.recommendedPsu = 500;
  }

  if (product.slotIndex === 3 && specs.sticksCount === undefined) {
    if (/2x\d+GB/i.test(title)) specs.sticksCount = 2;
    else if (/4x\d+GB/i.test(title)) specs.sticksCount = 4;
    else specs.sticksCount = 1;
  }

  if (product.slotIndex === 8 && !specs.coolerType) {
    if (/AIO|Nước|Aqua|Liquid|360|240/i.test(title)) {
      specs.coolerType = "AIO";
      if (!specs.radiatorSize) {
        if (/360/i.test(title)) specs.radiatorSize = 360;
        else if (/240/i.test(title)) specs.radiatorSize = 240;
        else if (/280/i.test(title)) specs.radiatorSize = 280;
        else if (/120/i.test(title)) specs.radiatorSize = 120;
      }
    } else {
      specs.coolerType = "AIR";
      if (!specs.coolerHeight) specs.coolerHeight = 155;
    }
  }

  return specs;
}

export function calculateTotalTdp(
  selectedItems: Record<number, { product: BuilderProduct; quantity: number }>
): number {
  let totalTdp = 0;
  Object.values(selectedItems).forEach(({ product, quantity }) => {
    const specs = getProductSpecs(product);
    totalTdp += (specs.tdp || 0) * (quantity || 1);
  });
  return totalTdp;
}

export function calculateRecommendedPsu(
  selectedItems: Record<number, { product: BuilderProduct; quantity: number }>
): number {
  const totalTdp = calculateTotalTdp(selectedItems);
  const vgaProduct = selectedItems[4]?.product;
  const vgaSpecs = vgaProduct ? getProductSpecs(vgaProduct) : null;
  const recommendedFromVga = vgaSpecs?.recommendedPsu || 0;

  const tdpBasedPsu = Math.ceil(totalTdp * 1.3);
  return Math.max(tdpBasedPsu, recommendedFromVga);
}

export function validatePcBuild(
  selectedItems: Record<number, { product: BuilderProduct; quantity: number }>
): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = [];

  const cpu = selectedItems[1]?.product;
  const mainboard = selectedItems[2]?.product;
  const ramItem = selectedItems[3];
  const vga = selectedItems[4]?.product;
  const psu = selectedItems[7]?.product;
  const cooler = selectedItems[8]?.product;
  const caseItem = selectedItems[9]?.product;

  const cpuSpecs = cpu ? getProductSpecs(cpu) : null;
  const mainSpecs = mainboard ? getProductSpecs(mainboard) : null;
  const ramSpecs = ramItem?.product ? getProductSpecs(ramItem.product) : null;
  const vgaSpecs = vga ? getProductSpecs(vga) : null;
  const psuSpecs = psu ? getProductSpecs(psu) : null;
  const coolerSpecs = cooler ? getProductSpecs(cooler) : null;
  const caseSpecs = caseItem ? getProductSpecs(caseItem) : null;

  if (cpuSpecs?.socket && mainSpecs?.socket) {
    if (cpuSpecs.socket.toLowerCase() !== mainSpecs.socket.toLowerCase()) {
      issues.push({
        id: "rule-cpu-mainboard",
        ruleName: "CPU vs Mainboard",
        message: "Socket CPU không tương thích với Mainboard",
        affectedSlots: [1, 2],
      });
    }
  }

  if (ramSpecs?.ramType && mainSpecs?.ramType) {
    if (ramSpecs.ramType.toLowerCase() !== mainSpecs.ramType.toLowerCase()) {
      issues.push({
        id: "rule-ram-mainboard",
        ruleName: "RAM vs Mainboard",
        message: "Chuẩn RAM (DDR4/DDR5) không vừa Mainboard",
        affectedSlots: [2, 3],
      });
    }
  }

  if (ramItem && mainSpecs?.ramSlots !== undefined) {
    const totalSticks = (ramSpecs?.sticksCount || 1) * (ramItem.quantity || 1);
    if (totalSticks > mainSpecs.ramSlots) {
      issues.push({
        id: "rule-ram-quantity",
        ruleName: "Số lượng RAM",
        message: `Số lượng thanh RAM (${totalSticks} thanh) vượt quá số khe cắm trên Bo mạch chủ (${mainSpecs.ramSlots} khe)`,
        affectedSlots: [2, 3],
      });
    }
  }

  if (vgaSpecs?.vgaLength !== undefined && caseSpecs?.maxGpuLength !== undefined) {
    if (vgaSpecs.vgaLength > caseSpecs.maxGpuLength) {
      issues.push({
        id: "rule-vga-case",
        ruleName: "VGA vs Case",
        message: "VGA quá dài không lắp vừa vào Case",
        affectedSlots: [4, 9],
      });
    }
  }

  if (
    coolerSpecs?.coolerType === "AIR" &&
    coolerSpecs.coolerHeight !== undefined &&
    caseSpecs?.maxCpuHeight !== undefined
  ) {
    if (coolerSpecs.coolerHeight > caseSpecs.maxCpuHeight) {
      issues.push({
        id: "rule-cooler-air-case",
        ruleName: "Tản khí vs Case",
        message: "Tản nhiệt CPU quá cao, không đóng được nắp Case",
        affectedSlots: [8, 9],
      });
    }
  }

  if (
    coolerSpecs?.coolerType === "AIO" &&
    coolerSpecs.radiatorSize !== undefined &&
    caseSpecs?.radiatorSupport
  ) {
    if (!caseSpecs.radiatorSupport.includes(coolerSpecs.radiatorSize)) {
      issues.push({
        id: "rule-cooler-aio-case",
        ruleName: "Tản AIO vs Case",
        message: "Case không hỗ trợ rad tản nhiệt cỡ này",
        affectedSlots: [8, 9],
      });
    }
  }

  if (mainSpecs?.formFactor && caseSpecs?.supportedForms) {
    const mainForm = mainSpecs.formFactor.toLowerCase();
    const caseForms = caseSpecs.supportedForms.map((f) => f.toLowerCase());
    if (!caseForms.includes(mainForm)) {
      issues.push({
        id: "rule-mainboard-case",
        ruleName: "Mainboard vs Case",
        message: "Kích thước Mainboard quá to so với Case",
        affectedSlots: [2, 9],
      });
    }
  }

  if (psuSpecs?.wattage !== undefined) {
    const totalTdp = calculateTotalTdp(selectedItems);
    const recommendedPsu = calculateRecommendedPsu(selectedItems);

    if (psuSpecs.wattage < recommendedPsu) {
      const affectedSlots = vga ? [4, 7] : [7];
      issues.push({
        id: "rule-psu-wattage",
        ruleName: "Công suất PSU",
        message: `Công suất nguồn (${psuSpecs.wattage}W) quá thấp so với yêu cầu hệ thống (cần tối thiểu ${recommendedPsu}W, tổng TDP ${totalTdp}W)`,
        affectedSlots,
      });
    }
  }

  return issues;
}

export function getIncompatibilityReason(
  candidateProduct: BuilderProduct,
  slotIndex: number,
  selectedItems: Record<number, { product: BuilderProduct; quantity: number }>
): string | null {
  const simulatedBuild = {
    ...selectedItems,
    [slotIndex]: {
      product: candidateProduct,
      quantity: selectedItems[slotIndex]?.quantity || 1,
    },
  };

  const issues = validatePcBuild(simulatedBuild);
  const relevantIssue = issues.find((issue) => issue.affectedSlots.includes(slotIndex));
  return relevantIssue ? relevantIssue.message : null;
}

export function isProductCompatibleWithBuild(
  candidateProduct: BuilderProduct,
  slotIndex: number,
  selectedItems: Record<number, { product: BuilderProduct; quantity: number }>
): boolean {
  return getIncompatibilityReason(candidateProduct, slotIndex, selectedItems) === null;
}

export function getMaxRamQuantity(
  ramProduct: BuilderProduct,
  mainboardProduct?: BuilderProduct
): number {
  if (!mainboardProduct) return 99;
  const mainSpecs = getProductSpecs(mainboardProduct);
  const ramSpecs = getProductSpecs(ramProduct);
  const ramSlots = mainSpecs.ramSlots ?? 4;
  const sticksCount = ramSpecs.sticksCount || 1;
  return Math.floor(ramSlots / sticksCount);
}

export function getMaxProductQuantity(
  product: BuilderProduct,
  slotIndex: number,
  selectedItems: Record<number, { product: BuilderProduct; quantity: number }>
): { maxQty: number; stockLimit: number; ramLimit?: number } {
  const stockLimit = product.stockQuantity ?? (product.stockStatus === 'Hết hàng' ? 0 : 10);

  if (slotIndex === 3) {
    const mainboardProduct = selectedItems[2]?.product;
    if (mainboardProduct) {
      const ramLimit = getMaxRamQuantity(product, mainboardProduct);
      const maxQty = Math.max(0, Math.min(stockLimit, ramLimit));
      return { maxQty, stockLimit, ramLimit };
    }
  }

  return { maxQty: stockLimit, stockLimit };
}
