import { beforeAll, describe, expect, it } from "vitest";
import { futureDateKey, getJson, postJson, registerBarbershop } from "../setup/client";

interface ApiService {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface ApiStaff {
  id: string;
  name: string;
}

interface ApiAppointment {
  id: string;
  startTime: string;
  status: string;
}

interface ErrorBody {
  error?: string;
}

describe("POST /api/appointments", () => {
  let accessToken: string;
  let barbershopId: string;
  let service: ApiService;
  let staff: ApiStaff;
  const date = futureDateKey(14);

  beforeAll(async () => {
    const shop = await registerBarbershop("apt");
    accessToken = shop.accessToken;
    barbershopId = shop.barbershopId;

    const serviceRes = await postJson<ApiService>(
      "/api/services",
      { name: "Corte Simples", duration: 30, price: 35 },
      accessToken
    );
    expect(serviceRes.status).toBe(201);
    service = serviceRes.body;

    const staffRes = await postJson<ApiStaff>("/api/staff", { name: "Barbeiro Teste" }, accessToken);
    expect(staffRes.status).toBe(201);
    staff = staffRes.body;
  });

  it("books an appointment inside working hours", async () => {
    const { status, body } = await postJson<ApiAppointment>("/api/appointments", {
      barbershopId,
      staffId: staff.id,
      serviceId: service.id,
      date,
      startTime: "10:00",
      endTime: "10:30",
      clientName: "Cliente Teste",
      clientPhone: "11999990000",
      totalPrice: service.price,
    });

    expect(status).toBe(201);
    expect(body.status).toBe("SCHEDULED");
  });

  it("rejects a second booking that overlaps the same staff member's slot", async () => {
    const conflicting = await postJson<ErrorBody>("/api/appointments", {
      barbershopId,
      staffId: staff.id,
      serviceId: service.id,
      date,
      startTime: "10:15",
      endTime: "10:45",
      clientName: "Outro Cliente",
      clientPhone: "11988880000",
      totalPrice: service.price,
    });

    expect(conflicting.status).toBe(409);
    expect(conflicting.body.error).toMatch(/ocupado/i);
  });

  it("allows a non-overlapping booking right after the first one ends", async () => {
    const { status } = await postJson<ApiAppointment>("/api/appointments", {
      barbershopId,
      staffId: staff.id,
      serviceId: service.id,
      date,
      startTime: "10:30",
      endTime: "11:00",
      clientName: "Terceiro Cliente",
      clientPhone: "11977770000",
      totalPrice: service.price,
    });
    expect(status).toBe(201);
  });

  it("rejects a booking outside the barbershop's working hours", async () => {
    const { status, body } = await postJson<ErrorBody>("/api/appointments", {
      barbershopId,
      staffId: staff.id,
      serviceId: service.id,
      date,
      startTime: "22:00",
      endTime: "22:30",
      clientName: "Cliente Fora do Horário",
      clientPhone: "11966660000",
      totalPrice: service.price,
    });
    expect(status).toBe(409);
    expect(body.error).toBeTruthy();
  });

  it("rejects a request missing required fields", async () => {
    const { status } = await postJson<ErrorBody>("/api/appointments", {
      barbershopId,
      staffId: staff.id,
    });
    expect(status).toBe(400);
  });

  it("marks the booked slot as unavailable in GET /api/appointments/slots", async () => {
    const params = new URLSearchParams({
      barbershopId,
      staffId: staff.id,
      date,
      duration: String(service.duration),
    });
    const { status, body } = await getJson<{ slots: { time: string; status: string }[] }>(
      `/api/appointments/slots?${params.toString()}`,
      accessToken
    );
    expect(status).toBe(200);
    const bookedSlot = body.slots.find((s) => s.time === "10:00");
    expect(bookedSlot?.status).toBe("booked");
  });
});
