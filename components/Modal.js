import { Dialog, Heading, Flex } from "@chakra-ui/react";

const sizeMap = {
  md: "600px",
  lg: "70vw",
  xl: "90vw",
};

const Modal = ({ show, onClose, title, children, size = "lg" }) => {
  if (!show) {
    return null;
  }

  const maxWidth = sizeMap[size] || sizeMap.md;

  return (
    <Dialog.Root
      open={show}
      onOpenChange={(detail) => !detail.open && onClose()}
      placement="center"
    >
      <Dialog.Backdrop bg="rgba(74, 73, 73, 0.6)" />
      <Dialog.Positioner>
        <Dialog.Content
          bg="#3a4049"
          color="#bebbbb"
          p="20px"
          borderRadius="8px"
          width="90%"
          maxWidth={maxWidth}
          boxShadow="0 5px 15px rgba(0, 0, 0, 0.3)"
          textAlign="left"
        >
          <Flex
            as={Dialog.Header}
            p={0}
            borderBottom="1px solid #555"
            paddingBottom="10px"
            marginBottom="20px"
            justify="space-between"
            align="center"
          >
            <Dialog.Title asChild>
              <Heading as="h4" size="lg" fontSize="1.5rem" m={0}>
                {title}
              </Heading>
            </Dialog.Title>
            <Dialog.CloseTrigger
              style={{
                background: "none",
                border: "none",
                fontSize: "2rem",
                color: "#f0f0f0",
                cursor: "pointer",
                lineHeight: 1,
                padding: 0,
              }}
            >
              &times;
            </Dialog.CloseTrigger>
          </Flex>
          <Dialog.Body p={0} fontSize="1rem" lineHeight="1.6">
            {children}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};

export default Modal;