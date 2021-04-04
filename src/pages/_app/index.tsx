import React from "react";
import { AppProps } from "next/app";
import "ress";
import { NextPage } from "next";

export type MyAppProps = AppProps;

const MyApp: NextPage<MyAppProps> = ({ Component, pageProps }) => {
  return <Component {...pageProps} />;
};

export default MyApp;
