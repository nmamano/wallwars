const UsernameIcon = ({ children }: { children: String }): JSX.Element => {
  return (
    <>
      <div
        style={{
          height: "2.35rem",
          width: "12rem",
          paddingLeft: "0.5rem",
          marginRight: "5px",
          borderRadius: "5px",
          border: "1px",
          borderColor: "white",
          borderStyle: "solid",
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
        }}
      >
        <p
          style={{
            color: "white",
            fontSize: "20px",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {children}
        </p>
      </div>
    </>
  );
};

export default UsernameIcon;
