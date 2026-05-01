import { ReactReaderStyle } from "react-reader";

const baseReaderStyles: typeof ReactReaderStyle = {
  ...ReactReaderStyle,
  reader: {
    ...ReactReaderStyle.reader,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  titleArea: {
    ...ReactReaderStyle.titleArea,
    display: "none",
  },
};

export const darkReaderStyles: typeof ReactReaderStyle = {
  ...baseReaderStyles,
  readerArea: {
    ...ReactReaderStyle.readerArea,
    backgroundColor: "#070e1d",
    transition: "all 0.3s ease",
  },
  tocArea: {
    ...ReactReaderStyle.tocArea,
    background: "#0b1323",
  },
  tocAreaButton: {
    ...ReactReaderStyle.tocAreaButton,
    color: "#a4abbf",
  },
  arrow: {
    ...ReactReaderStyle.arrow,
    color: "#a4abbf",
  },
};

export const lightReaderStyles: typeof ReactReaderStyle = {
  ...baseReaderStyles,
  readerArea: {
    ...ReactReaderStyle.readerArea,
    backgroundColor: "#F8FAFC",
    transition: "all 0.3s ease",
  },
  tocArea: {
    ...ReactReaderStyle.tocArea,
    background: "#F1F5F9",
  },
  tocAreaButton: {
    ...ReactReaderStyle.tocAreaButton,
    color: "#64748B",
  },
  arrow: {
    ...ReactReaderStyle.arrow,
    color: "#64748B",
  },
};
