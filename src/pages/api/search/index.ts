import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import { parseStringPromise } from "xml2js";
import camelcaseKeys from "camelcase-keys";

const handler = async (
  { query: { q } }: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  const { data } = await axios.get("http://www.google.com/complete/search", {
    params: {
      q,
      output: "toolbar",
    },
  });
  const jsData = await parseStringPromise(data);
  const { toplevel } = camelcaseKeys(jsData, { deep: true });

  if (typeof toplevel !== "object") {
    res.send([]);
    res.end();
  }

  const { completeSuggestion } = toplevel;

  res.send(completeSuggestion);
  res.end();
};

export default handler;
