import React, {
  CSSProperties,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Head from "next/head";
import ReactThreeToggle from "react-three-toggle";
import { Controller, useForm } from "react-hook-form";
import styles from "./styles/style.module.scss";
import { useWindowHeight } from "@react-hook/window-size";
import Autosuggest, { AutosuggestProps } from "react-autosuggest";
import axios from "axios";
import useDebounce from "@rooks/use-debounce";
import { MdClose, MdSearch } from "react-icons/md";
import theme from "./styles/theme.module.scss";
import useLocalstorage from "@rooks/use-localstorage";
import useOutsideClickRef from "@rooks/use-outside-click-ref";
import { FiClock } from "react-icons/fi";
import useDidMount from "@rooks/use-did-mount";
import usePwa from "use-pwa";

type Suggestion = {
  type: "history" | "search";
  value: string;
};

const Pages: FC = () => {
  const sites = useMemo(
    () => [
      {
        label: "味の素パーク",
        name: "ajinomoto",
      },
      {
        label: "クックパッド",
        name: "cookpad",
      },
      {
        label: "DELISH KITCHEN",
        name: "delishkitchen",
      },
      {
        label: "E・レシピ",
        name: "erecipe",
      },
      {
        label: "キッコーマン",
        name: "kikkoman",
      },
      {
        label: "クラシル",
        name: "kurashiru",
      },
      {
        label: "レタスクラブ",
        name: "lettuceclub",
      },
      {
        label: "Nadia",
        name: "nadia",
      },
      {
        label: "オレンジページnet",
        name: "orangepage",
      },
      {
        label: "楽天レシピ",
        name: "rakuten",
      },
      {
        label: "白ごはん.com",
        name: "sirogohan",
      },
    ],
    []
  );
  const [site, setSite] = useLocalstorage("site");
  const [histories, setHistories] = useLocalstorage("histories", []);
  const defaultValues = useMemo(
    () => ({
      q: "",
      site: sites.reduce<{ [key: string]: "false" | "true" | "" }>(
        (prevValue, { name }) => {
          prevValue[name] = "";

          return prevValue;
        },
        {}
      ),
    }),
    [sites]
  );
  const { control, handleSubmit, register, setValue } = useForm<{
    q: string;
    site: { [key: string]: "false" | "true" | "" };
  }>({
    defaultValues,
  });
  const isRemovedHistory = useRef(false);
  const onSubmit = useMemo(
    () =>
      handleSubmit(({ q, site }) => {
        const { current } = isRemovedHistory;

        if (current) {
          isRemovedHistory.current = false;

          return;
        }

        if (!q.trim()) {
          return;
        }

        setSite(site);
        setHistories(
          Array.from(
            new Set([...histories, q.trim()].filter((_, index) => index < 10))
          ).reverse() || []
        );

        const plusSiteQuery = Object.keys(site)
          .filter((key) => site[key] === "true")
          .map((key) => sites.find(({ name }) => key === name))
          .map(({ label }) => label)
          .join(" ");
        const minusSiteQuery = Object.keys(site)
          .filter((key) => site[key] === "false")
          .map((key) => sites.find(({ name }) => key === name))
          .map(({ label }) => `-${label}`)
          .join(" ");
        const query = `${
          plusSiteQuery || "レシピ"
        } ${minusSiteQuery} ${q}`.replace(/\s+/g, " ");

        window.open(`http://www.google.co.jp/search?num=100&q=${query}`);
      }),
    [handleSubmit, histories, setHistories, setSite, sites]
  );
  const [labels, setLabels] = useState(null);
  const onlyHeight = useWindowHeight();
  const [wrapperStyle, setWrapperStyle] = useState<CSSProperties>({
    height: 0,
  });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const handleSuggestionsFetchRequested = useCallback<
    AutosuggestProps<any, any>["onSuggestionsFetchRequested"]
  >(
    async ({ reason, value }) => {
      if (!value.trim() || reason !== "input-changed") {
        return;
      }

      try {
        const { data } = await axios.get("/api/search", {
          params: {
            q: value,
          },
        });
        const suggestions = data
          .map(({ suggestion }) => {
            const { data } = suggestion[0]["$"];

            return data;
          })
          .filter(
            (value: string) =>
              !histories.some((history: string) => value === history)
          )
          .map((value: string) => ({
            value,
            type: "search",
          }));

        setSuggestions(
          [
            ...histories
              .filter((history: string) => history.startsWith(value))
              .map((history: string) => ({
                type: "history",
                value: history,
              })),
            ...suggestions,
          ].filter((_, index) => index < 10)
        );
      } catch {}
    },
    [histories]
  );
  const handleSuggestionsFetchRequestedDebounce = useDebounce(
    handleSuggestionsFetchRequested,
    500
  ) as typeof handleSuggestionsFetchRequested;
  const [alwaysRenderSuggestions, setAlwaysRenderSuggestions] = useState(false);
  const outsideClick = useCallback(() => {
    setAlwaysRenderSuggestions(false);
  }, []);
  const [ref] = useOutsideClickRef(outsideClick);
  const {
    appinstalled,
    canInstallprompt,
    enabledPwa,
    handleClickOnInstallPrompt,
  } = usePwa();

  useDidMount(() => {
    if (site) {
      setValue("site", site);
    }

    setLabels(
      sites.map(({ label, name }) => (
        <label className={styles.label} key={name}>
          <ReactThreeToggle
            className={{
              selectedClassName: styles.threeToggleSelected,
              wrapperClassName: styles.threeToggleWrapper,
            }}
            height={10}
            initialValue={(site || {})[name] || ""}
            isWrap={true}
            name={`site.${name}`}
            ref={register}
            values={["false", "", "true"]}
            width={30}
          />
          <span className={styles.labelInner}>{label}</span>
        </label>
      ))
    );
  });

  useEffect(() => {
    setWrapperStyle({ height: onlyHeight });
  }, [onlyHeight]);

  useEffect(() => {
    console.log(alwaysRenderSuggestions, histories);

    if (!alwaysRenderSuggestions || !histories) {
      return;
    }

    setSuggestions(
      histories.map((history: string) => ({
        type: "history",
        value: history,
      }))
    );
  }, [alwaysRenderSuggestions, histories, setSuggestions]);

  return (
    <>
      <Head>
        <title>レシグル | レシピをGoogle検索する</title>
      </Head>
      <div className={styles.wrapper} style={wrapperStyle}>
        <div className={styles.inner}>
          <h1 className={styles.heading1}>
            <span className={styles.re}>レ</span>
            <span className={styles.shi}>シ</span>
            <span className={styles.gu}>グ</span>
            <span className={styles.ru}>ル</span>
          </h1>
          <form onSubmit={onSubmit}>
            <Controller
              control={control}
              name="q"
              render={({ onBlur, value }) => (
                <Autosuggest
                  alwaysRenderSuggestions={alwaysRenderSuggestions}
                  getSuggestionValue={({ value }) => value}
                  inputProps={{
                    onBlur,
                    value,
                    onChange: (_, { newValue }) => {
                      const { current } = isRemovedHistory;

                      if (current) {
                        isRemovedHistory.current = false;

                        return;
                      }

                      setValue("q", newValue);
                    },
                    onKeyDown: (event) => {
                      const { keyCode } = event;

                      if (keyCode !== 13) {
                        return;
                      }

                      event.preventDefault();

                      handleSubmit(onSubmit)();
                    },
                    placeholder: "料理名や食材で検索",
                    type: "search",
                  }}
                  onSuggestionsClearRequested={() => {}}
                  onSuggestionsFetchRequested={
                    handleSuggestionsFetchRequestedDebounce
                  }
                  renderInputComponent={(props) => (
                    <div className={styles.inputWrapper}>
                      <MdSearch color="#9aa0a6" size={20} />
                      <div
                        onClick={() => {
                          setAlwaysRenderSuggestions(true);
                        }}
                        ref={ref}
                      >
                        <input {...props} className={styles.input} />
                      </div>
                      <button
                        className={styles.closeButton}
                        onClick={() => {
                          setSuggestions([]);
                          setValue("q", "");
                        }}
                      >
                        <MdClose color="#9aa0a6" size={20} />
                      </button>
                    </div>
                  )}
                  renderSuggestion={({ type, value }) => (
                    <div className={styles.suggestionWrapper}>
                      {type === "history" ? (
                        <FiClock color="#9aa0a6" size={16} />
                      ) : (
                        <MdSearch color="#9aa0a6" size={16} />
                      )}
                      <div
                        onClick={() => {
                          setValue("q", value);

                          handleSubmit(onSubmit)();
                        }}
                      >
                        {value}
                      </div>
                      {type === "history" ? (
                        <button
                          className={styles.removeButton}
                          onClick={() => {
                            isRemovedHistory.current = true;

                            setHistories(
                              Array.from(
                                new Set(
                                  histories.filter(
                                    (prevHistory: string) =>
                                      value !== prevHistory
                                  )
                                )
                              )
                            );
                          }}
                        >
                          削除
                        </button>
                      ) : null}
                    </div>
                  )}
                  suggestions={suggestions}
                  theme={theme}
                />
              )}
            />
            <fieldset className={styles.fieldset}>
              <div className={styles.fieldsetInner}>{labels}</div>
            </fieldset>
            <div className={styles.buttonWrapper}>
              <button className={styles.submitButton} type="submit">
                レシグル 検索
              </button>
            </div>
          </form>
        </div>
        <footer className={styles.footer}>
          <div>
            {enabledPwa ? (
              <button
                className={styles.addHomeButton}
                disabled={appinstalled || !canInstallprompt}
                onClick={handleClickOnInstallPrompt}
              >
                ホームに追加
              </button>
            ) : null}
          </div>
          <a
            className={styles.link}
            href="https://kk-web.link/contact"
            rel="noreferrer"
            target="_blank"
          >
            フィードバックを送信
          </a>
        </footer>
      </div>
    </>
  );
};

export default Pages;
