import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CandidateItem } from "../CandidateItem";
import { createMockCandidateVM } from "@/tests/helpers";

describe("CandidateItem", () => {
  describe("compact view", () => {
    it("should render candidate in compact view", () => {
      const vm = createMockCandidateVM({
        front: "Test Question?",
        back: "Test Answer",
        decision: "pending",
      });
      const onChange = vi.fn();
      const onAccept = vi.fn();
      const onReject = vi.fn();

      render(<CandidateItem vm={vm} onChange={onChange} onAccept={onAccept} onReject={onReject} index={0} />);

      expect(screen.getByText(/test question/i)).toBeInTheDocument();
      expect(screen.getByText(/test answer/i)).toBeInTheDocument();
      expect(screen.getByText(/oczekuje/i)).toBeInTheDocument();
    });

    it("should show focused ring when isFocused=true", () => {
      const vm = createMockCandidateVM();
      const onChange = vi.fn();
      const onAccept = vi.fn();
      const onReject = vi.fn();

      const { container } = render(
        <CandidateItem vm={vm} onChange={onChange} onAccept={onAccept} onReject={onReject} index={0} isFocused={true} />
      );

      const card = container.querySelector('[id="card-0"]');
      expect(card?.className).toContain("ring");
    });
  });

  describe("actions", () => {
    it("should call onAccept when accept button is clicked", async () => {
      const user = userEvent.setup();
      const vm = createMockCandidateVM();
      const onChange = vi.fn();
      const onAccept = vi.fn();
      const onReject = vi.fn();

      render(<CandidateItem vm={vm} onChange={onChange} onAccept={onAccept} onReject={onReject} index={0} />);

      await user.click(screen.getByLabelText(/zaakceptuj kartę 1/i));

      expect(onAccept).toHaveBeenCalledWith(vm.localId);
    });

    it("should call onReject when reject button is clicked", async () => {
      const user = userEvent.setup();
      const vm = createMockCandidateVM();
      const onChange = vi.fn();
      const onAccept = vi.fn();
      const onReject = vi.fn();

      render(<CandidateItem vm={vm} onChange={onChange} onAccept={onAccept} onReject={onReject} index={0} />);

      await user.click(screen.getByLabelText(/odrzuć kartę 1/i));

      expect(onReject).toHaveBeenCalledWith(vm.localId);
    });

    it("should enter edit mode when edit button is clicked", async () => {
      const user = userEvent.setup();
      const vm = createMockCandidateVM();
      const onChange = vi.fn();
      const onAccept = vi.fn();
      const onReject = vi.fn();
      const onEditingChange = vi.fn();

      render(
        <CandidateItem
          vm={vm}
          onChange={onChange}
          onAccept={onAccept}
          onReject={onReject}
          index={0}
          onEditingChange={onEditingChange}
        />
      );

      await user.click(screen.getByLabelText(/edytuj kartę 1/i));

      expect(onEditingChange).toHaveBeenCalledWith(vm.localId);
      expect(screen.getByLabelText(/pytanie/i)).toBeInTheDocument();
    });
  });

  describe("edit view", () => {
    it("should render edit form when isEditing=true", () => {
      const vm = createMockCandidateVM({
        front: "Question?",
        back: "Answer",
      });
      const onChange = vi.fn();
      const onAccept = vi.fn();
      const onReject = vi.fn();

      render(
        <CandidateItem vm={vm} onChange={onChange} onAccept={onAccept} onReject={onReject} index={0} isEditing={true} />
      );

      expect(screen.getByLabelText(/pytanie/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/odpowiedź/i)).toBeInTheDocument();
    });

    it("should call onChange when fields are edited", async () => {
      const user = userEvent.setup();
      const vm = createMockCandidateVM();
      const onChange = vi.fn();
      const onAccept = vi.fn();
      const onReject = vi.fn();

      render(
        <CandidateItem vm={vm} onChange={onChange} onAccept={onAccept} onReject={onReject} index={0} isEditing={true} />
      );

      const frontInput = screen.getByLabelText(/pytanie/i);
      await user.clear(frontInput);
      await user.type(frontInput, "Edited Question?");

      expect(onChange).toHaveBeenCalled();
    });

    it("should show validation errors", () => {
      const vm = createMockCandidateVM({
        validation: { frontError: "Maksimum 200 znaków", backError: "Maksimum 500 znaków" },
      });
      const onChange = vi.fn();
      const onAccept = vi.fn();
      const onReject = vi.fn();

      render(
        <CandidateItem vm={vm} onChange={onChange} onAccept={onAccept} onReject={onReject} index={0} isEditing={true} />
      );

      expect(screen.getByText(/maksimum 200 znaków/i)).toBeInTheDocument();
      expect(screen.getByText(/maksimum 500 znaków/i)).toBeInTheDocument();
    });

    it("should disable 'Gotowe' button when validation errors exist", () => {
      const vm = createMockCandidateVM({
        validation: { frontError: "Error" },
      });
      const onChange = vi.fn();
      const onAccept = vi.fn();
      const onReject = vi.fn();

      render(
        <CandidateItem vm={vm} onChange={onChange} onAccept={onAccept} onReject={onReject} index={0} isEditing={true} />
      );

      expect(screen.getByRole("button", { name: /gotowe/i })).toBeDisabled();
    });
  });
});
