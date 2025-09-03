import { create } from "zustand";

interface StateProp {
    count: number,
    increment: () => void
    decrement: () => void
    incrementAsync: () => Promise<void>
    reset: () => void,
    newCount: (newCount: number) => void
    
}
const useCounterStore = create<StateProp>((set) => ({
    count: 0,
    increment: () => set((state) => ({count: state.count + 1})),
    decrement: () => set((state) => ({count: state.count - 1})),
    incrementAsync: async() => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        set((state) => ({count: state.count - 1}))
    },
    reset: () => set({count: 0}),
    newCount: (newCount: number) => set({count: newCount})
}))


export { useCounterStore }