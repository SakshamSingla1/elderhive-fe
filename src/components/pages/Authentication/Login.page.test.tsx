import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import LoginPage from "./Login.page";

describe("Login.page (role picker)", () => {
  it("renders a link for every role, pointing at its own dedicated login path", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /Family Member/ })).toHaveAttribute("href", "/login/family");
    expect(screen.getByRole("link", { name: /Caretaker/ })).toHaveAttribute("href", "/login/caretaker");
    expect(screen.getByRole("link", { name: /^Elder/ })).toHaveAttribute("href", "/login/elder");
    expect(screen.getByRole("link", { name: /^Admin/ })).toHaveAttribute("href", "/admin/login");
    expect(screen.getByRole("link", { name: /Super Admin/ })).toHaveAttribute("href", "/login/super-admin");
  });

  it("shows no banners by default", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.queryByText(/Account created!/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Password reset!/)).not.toBeInTheDocument();
    expect(screen.queryByText(/session has expired/)).not.toBeInTheDocument();
  });

  it("shows the session-expired banner when ?auth=expired is present", () => {
    render(
      <MemoryRouter initialEntries={["/login?auth=expired"]}>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Your session has expired/)).toBeInTheDocument();
  });

  it("shows the registered banner when arriving with registered=true in location state", () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/login", state: { registered: true } }]}>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Account created!/)).toBeInTheDocument();
  });

  it("shows the password-reset banner when arriving with passwordReset=true in location state", () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/login", state: { passwordReset: true } }]}>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Password reset!/)).toBeInTheDocument();
  });
});
