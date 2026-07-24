import type { NextPage } from "next";
import { EscrowDemo } from "~~/app/_components/EscrowDemo";
import { LicenceCheckPanel } from "~~/components/LicenceCheckPanel";

const Home: NextPage = () => {
  return (
    <div className="flex flex-col gap-8">
      <LicenceCheckPanel />
      <EscrowDemo />
    </div>
  );
};

export default Home;
