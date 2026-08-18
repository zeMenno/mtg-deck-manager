import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyServiceWorkerUpdate,
  registerServiceWorker,
} from "@/lib/pwa/register-sw";

class FakeWorker extends EventTarget {
  state = "installing";
  postMessage = vi.fn();
}

class FakeRegistration extends EventTarget {
  waiting: FakeWorker | null = null;
  installing: FakeWorker | null = null;
}

type ContainerStub = {
  register: ReturnType<typeof vi.fn>;
  controller: object | null;
  addEventListener: ReturnType<typeof vi.fn>;
};

function stubNavigator(registration: FakeRegistration, controlled: boolean) {
  const container: ContainerStub = {
    register: vi.fn().mockResolvedValue(registration),
    controller: controlled ? {} : null,
    addEventListener: vi.fn(),
  };

  vi.stubGlobal("navigator", { serviceWorker: container });

  return container;
}

function asRegistration(registration: FakeRegistration) {
  return registration as unknown as ServiceWorkerRegistration;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("registerServiceWorker", () => {
  it("does nothing when service workers are unsupported", async () => {
    vi.stubGlobal("navigator", {});

    await expect(
      registerServiceWorker({ onUpdateWaiting: vi.fn() }),
    ).resolves.toBeNull();
  });

  it("registers at the root scope", async () => {
    const container = stubNavigator(new FakeRegistration(), false);

    await registerServiceWorker({ onUpdateWaiting: vi.fn() });

    expect(container.register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
  });

  it("reports a worker that was already waiting from a previous visit", async () => {
    const registration = new FakeRegistration();
    registration.waiting = new FakeWorker();
    stubNavigator(registration, true);
    const onUpdateWaiting = vi.fn();

    await registerServiceWorker({ onUpdateWaiting });

    expect(onUpdateWaiting).toHaveBeenCalledTimes(1);
  });

  it("treats a first install as no update, not a waiting update", async () => {
    const registration = new FakeRegistration();
    registration.waiting = new FakeWorker();
    stubNavigator(registration, false);
    const onUpdateWaiting = vi.fn();

    await registerServiceWorker({ onUpdateWaiting });

    expect(onUpdateWaiting).not.toHaveBeenCalled();
  });

  it("reports an update once the new worker finishes installing", async () => {
    const registration = new FakeRegistration();
    stubNavigator(registration, true);
    const onUpdateWaiting = vi.fn();

    await registerServiceWorker({ onUpdateWaiting });

    const installing = new FakeWorker();
    registration.installing = installing;
    registration.dispatchEvent(new Event("updatefound"));

    expect(onUpdateWaiting).not.toHaveBeenCalled();

    installing.state = "installed";
    installing.dispatchEvent(new Event("statechange"));

    expect(onUpdateWaiting).toHaveBeenCalledTimes(1);
  });

  it("ignores the install of the very first worker", async () => {
    const registration = new FakeRegistration();
    stubNavigator(registration, false);
    const onUpdateWaiting = vi.fn();

    await registerServiceWorker({ onUpdateWaiting });

    const installing = new FakeWorker();
    registration.installing = installing;
    registration.dispatchEvent(new Event("updatefound"));
    installing.state = "installed";
    installing.dispatchEvent(new Event("statechange"));

    expect(onUpdateWaiting).not.toHaveBeenCalled();
  });
});

describe("applyServiceWorkerUpdate", () => {
  it("asks the waiting worker to take over, then reloads on handover", () => {
    const registration = new FakeRegistration();
    const waiting = new FakeWorker();
    registration.waiting = waiting;
    const container = stubNavigator(registration, true);
    const reload = vi.fn();
    vi.stubGlobal("window", { location: { reload } });

    applyServiceWorkerUpdate(asRegistration(registration));

    expect(waiting.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
    expect(reload).not.toHaveBeenCalled();

    const [event, handler] = container.addEventListener.mock.calls[0] as [
      string,
      () => void,
    ];
    expect(event).toBe("controllerchange");

    handler();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("reloads immediately when there is no waiting worker", () => {
    const registration = new FakeRegistration();
    stubNavigator(registration, true);
    const reload = vi.fn();
    vi.stubGlobal("window", { location: { reload } });

    applyServiceWorkerUpdate(asRegistration(registration));

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
