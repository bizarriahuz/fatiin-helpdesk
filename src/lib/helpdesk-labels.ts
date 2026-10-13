const ticketCategoryLabels: Record<string, string> = {
  hardware: "Hardware",
  software: "Software",
  printer: "Printer",
  network: "Network",
  email: "Email",
  ms365: "MS365",
};

const ticketTypeLabels: Record<string, string> = {
  incident: "Incident",
  problem: "Problem",
  request: "Request",
  change: "Change",
};

const assetCategoryLabels: Record<string, string> = {
  audio_visual: "Audio or video",
  network_wifi: "Network or Wi-Fi",
  computer_device: "Computer",
  printer: "Printer",
  other: "Other",
};

const ticketStatusLabels: Record<string, string> = {
  new: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

const assetStatusLabels: Record<string, string> = {
  available: "Available",
  in_use: "In use",
  in_repair: "In repair",
  retired: "Retired",
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  normal: "Medium",
  high: "High",
  urgent: "Critical",
};

export function ticketTypeLabel(value: string) {
  return ticketTypeLabels[value] ?? value.replaceAll("_", " ");
}

export function ticketCategoryLabel(value: string) {
  return ticketCategoryLabels[value] ?? value.replaceAll("_", " ");
}

export function assetCategoryLabel(value: string) {
  return value === "account_access" ? "Other" : assetCategoryLabels[value] ?? value.replaceAll("_", " ");
}

export function ticketStatusLabel(value: string) {
  return ticketStatusLabels[value] ?? value.replaceAll("_", " ");
}

export function assetStatusLabel(value: string) {
  return assetStatusLabels[value] ?? value.replaceAll("_", " ");
}

export function priorityLabel(value: string) {
  return priorityLabels[value] ?? value;
}

export function deviceStatusLabel(value: string) {
  const labels: Record<string, string> = {
    waiting: "Waiting",
    online: "Online",
    offline: "Offline",
    paused: "Paused",
  };
  return labels[value] ?? value;
}
