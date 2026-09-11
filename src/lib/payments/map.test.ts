import { describe, it, expect } from "vitest";
import { mpPreapprovalStatusToIntent, mpPaymentStatusToIntent } from "./map";

describe("mapeamento de status do gateway -> intencao", () => {
  it("preapproval", () => {
    expect(mpPreapprovalStatusToIntent("authorized")).toBe("paid");
    expect(mpPreapprovalStatusToIntent("paused")).toBe("payment_failed");
    expect(mpPreapprovalStatusToIntent("cancelled")).toBe("canceled");
    expect(mpPreapprovalStatusToIntent("weird")).toBe("ignore");
  });
  it("payment", () => {
    expect(mpPaymentStatusToIntent("approved")).toBe("paid");
    expect(mpPaymentStatusToIntent("rejected")).toBe("payment_failed");
    expect(mpPaymentStatusToIntent("refunded")).toBe("payment_failed");
    expect(mpPaymentStatusToIntent("pending")).toBe("ignore");
  });
});
