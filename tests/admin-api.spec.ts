/** @jest-environment node */
import { beforeAll, expect, test } from "@jest/globals";
import { adminDb, getProduct, listProductIds, listProducts, simulateOtherAdminEdit, updateProduct, VersionConflictError } from "@/api/adminApi";
import { network } from "@/mock/network";

beforeAll(async () => {
  network.setLatency(0);
  await adminDb();
});

test("lists paginate and filter by category and search", async () => {
  const page = await listProducts({ page: 2, pageSize: 10 });
  expect(page.total).toBe(28);
  expect(page.items).toHaveLength(10);
  const bags = await listProductIds({ category: "Bags" });
  expect(bags).toHaveLength(4);
  expect((await listProducts({ search: "skillet" })).items[0].title).toBe("Cast Iron Skillet");
});

test("saves are atomic and reject stale versions", async () => {
  const product = await getProduct("prod-1");
  await simulateOtherAdminEdit("prod-1");
  await expect(updateProduct("prod-1", { title: "Stale" }, product.version)).rejects.toBeInstanceOf(VersionConflictError);
  const [first, second] = product.variants;
  await expect(
    updateProduct("prod-1", { variants: { [first.id]: { priceCents: 1000 }, [second.id]: { priceCents: -5 } } }),
  ).rejects.toThrow("non-negative");
  expect((await getProduct("prod-1")).variants[0].priceCents).not.toBe(1000);
});
